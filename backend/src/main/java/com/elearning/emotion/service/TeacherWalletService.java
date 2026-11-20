package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.dto.PayoutRequestDto;
import com.elearning.emotion.dto.TeacherEscrowDto;
import com.elearning.emotion.dto.TeacherWalletEntryDto;
import com.elearning.emotion.dto.TeacherWalletSummaryDto;
import com.elearning.emotion.entity.PayoutRequest;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.OrderRepository;
import com.elearning.emotion.repository.PayoutRequestRepository;
import com.elearning.emotion.repository.RewardEscrowRepository;
import com.elearning.emotion.repository.TeacherWalletEntryRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherWalletService {

    private final TeacherWalletEntryRepository walletEntryRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final UserRepository userRepository;
    private final PaymentProperties paymentProperties;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;
    private final RewardEscrowRepository rewardEscrowRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public TeacherWalletSummaryDto getWalletSummary(String teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin giảng viên"));

        LocalDateTime now = LocalDateTime.now();
        BigDecimal rawAvailableLedger = walletEntryRepository.sumAvailableLedgerByTeacherId(teacherId, now);
        BigDecimal sumAvailableLedger = (rawAvailableLedger != null ? rawAvailableLedger : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal rawPendingPayouts = payoutRequestRepository.sumPendingPayoutByTeacherId(teacherId);
        BigDecimal sumPendingPayouts = (rawPendingPayouts != null ? rawPendingPayouts : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);

        BigDecimal availableBalance = sumAvailableLedger.subtract(sumPendingPayouts).max(BigDecimal.ZERO);
        BigDecimal rawTotalPaidOut = payoutRequestRepository.sumApprovedPayoutByTeacherId(teacherId);
        BigDecimal totalPaidOut = (rawTotalPaidOut != null ? rawTotalPaidOut : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal rawPendingReward = rewardEscrowRepository.sumHoldingByTeacher(teacherId);
        BigDecimal pendingRewardAmount = (rawPendingReward != null ? rawPendingReward : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);

        boolean hasPending = payoutRequestRepository.existsByTeacherIdAndStatus(teacherId, "PENDING");

        BigDecimal rawTotalEarned = walletEntryRepository.sumEarnedByTeacherId(teacherId);
        BigDecimal totalEarned = (rawTotalEarned != null ? rawTotalEarned : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal grossSales = orderRepository.sumRevenueByTeacherId(teacherId);
        BigDecimal platformFeeTotal = orderRepository.sumPlatformFeeByTeacherId(teacherId);
        BigDecimal rawRewardClaimed = rewardEscrowRepository.sumByTeacherAndStatus(teacherId, "CLAIMED");
        BigDecimal rewardClaimed = (rawRewardClaimed != null ? rawRewardClaimed : BigDecimal.ZERO)
                .setScale(0, RoundingMode.HALF_UP);
        long holdingCount = rewardEscrowRepository.countHoldingByTeacher(teacherId);
        LocalDateTime nextHoldingDue = rewardEscrowRepository.minHoldingUntilByTeacher(teacherId);

        // Hệ thức kiểm tra: thực nhận = có thể rút + chờ duyệt + đã rút
        BigDecimal drift = totalEarned
                .subtract(availableBalance.add(sumPendingPayouts).add(totalPaidOut));
        if (drift.abs().compareTo(BigDecimal.ONE) > 0) {
            log.warn("Wallet drift for teacher {}: earned={}, available={}, pending={}, paid={}, drift={}",
                    teacherId, totalEarned, availableBalance, sumPendingPayouts, totalPaidOut, drift);
        }

        return new TeacherWalletSummaryDto(
                availableBalance,
                totalPaidOut,
                sumPendingPayouts,
                pendingRewardAmount,
                paymentProperties.getMinPayoutAmount(),
                hasPending,
                teacher.getBankId(),
                teacher.getBankAccountNo(),
                teacher.getBankAccountName(),
                totalEarned,
                grossSales != null ? grossSales : BigDecimal.ZERO,
                platformFeeTotal != null ? platformFeeTotal : BigDecimal.ZERO,
                rewardClaimed,
                holdingCount,
                nextHoldingDue
        );
    }

    @Transactional(readOnly = true)
    public Page<TeacherWalletEntryDto> getWalletEntries(String teacherId, Pageable pageable) {
        return walletEntryRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId, pageable)
                .map(TeacherWalletEntryDto::from);
    }

    @Transactional(readOnly = true)
    public List<PayoutRequestDto> getMyPayoutRequests(String teacherId) {
        return payoutRequestRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(PayoutRequestDto::from)
                .toList();
    }

    @Transactional
    public PayoutRequestDto requestPayout(String teacherId, BigDecimal requestedAmount) {
        if (requestedAmount == null || requestedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền rút phải lớn hơn 0");
        }
        BigDecimal cleanAmount = requestedAmount.setScale(0, RoundingMode.HALF_UP);

        // H-a: Khóa bi quan dòng giảng viên để chống race condition khi gửi nhiều yêu cầu rút tiền cùng lúc
        User teacher = userRepository.findByIdWithLock(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin giảng viên"));

        // H5 Item 4: Giảng viên phải được duyệt ACTIVE mới được rút tiền
        if (!"ACTIVE".equalsIgnoreCase(teacher.getStatus())) {
            throw new IllegalStateException("Tài khoản giảng viên của bạn chưa được kích hoạt hoặc đang chờ duyệt. Không thể yêu cầu rút tiền.");
        }

        if (teacher.getBankId() == null || teacher.getBankId().isBlank()
                || teacher.getBankAccountNo() == null || teacher.getBankAccountNo().isBlank()
                || teacher.getBankAccountName() == null || teacher.getBankAccountName().isBlank()) {
            throw new IllegalArgumentException("Vui lòng cập nhật đầy đủ thông tin tài khoản ngân hàng thụ hưởng tại trang Thông tin cá nhân trước khi rút tiền.");
        }

        if (payoutRequestRepository.existsByTeacherIdAndStatus(teacherId, "PENDING")) {
            throw new IllegalArgumentException("Bạn đang có một yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi hoàn tất trước khi tạo yêu cầu mới.");
        }

        if (cleanAmount.compareTo(paymentProperties.getMinPayoutAmount()) < 0) {
            throw new IllegalArgumentException("Số tiền rút tối thiểu là "
                    + String.format("%,d", paymentProperties.getMinPayoutAmount().longValue()) + " đ");
        }

        LocalDateTime now = LocalDateTime.now();
        BigDecimal sumAvailableLedger = walletEntryRepository.sumAvailableLedgerByTeacherId(teacherId, now);
        BigDecimal sumPendingPayouts = payoutRequestRepository.sumPendingPayoutByTeacherId(teacherId);
        BigDecimal currentAvailable = sumAvailableLedger.subtract(sumPendingPayouts);

        if (cleanAmount.compareTo(currentAvailable) > 0) {
            throw new IllegalArgumentException("Số dư khả dụng hiện tại không đủ để thực hiện yêu cầu rút này (Khả dụng: "
                    + String.format("%,d", currentAvailable.longValue()) + " đ)");
        }

        PayoutRequest req = PayoutRequest.builder()
                .teacher(teacher)
                .amount(cleanAmount)
                .bankId(teacher.getBankId())
                .bankAccountNo(teacher.getBankAccountNo())
                .bankAccountName(teacher.getBankAccountName())
                .status("PENDING")
                .build();

        PayoutRequest saved = payoutRequestRepository.save(req);
        log.info("Teacher {} submitted payout request {} for amount {}", teacherId, saved.getId(), cleanAmount);

        auditService.log(teacher, "PAYOUT_REQUEST_CREATED", "PAYOUT_REQUEST", saved.getId(),
                "Số tiền yêu cầu: " + cleanAmount + " đ về STK: " + teacher.getBankAccountNo() + " (" + teacher.getBankId() + ")");

        notificationService.send(
                teacherId,
                "Yêu cầu rút tiền đang chờ xử lý",
                "Yêu cầu rút " + String.format("%,d", cleanAmount.longValue()) + " đ đã được gửi đến ban quản trị và đang chờ giải ngân.",
                "FINANCE",
                saved.getId(),
                "/dashboard/teacher?tab=transactions"
        );

        try {
            realtimePublisher.publishToRole("ADMIN", "admin-stats", java.util.Map.of(
                    "reason", "NEW_PAYOUT_REQUEST",
                    "payoutId", saved.getId()
            ));
        } catch (Exception ignored) {}

        return PayoutRequestDto.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<TeacherEscrowDto> getEscrows(String teacherId, Pageable pageable) {
        return rewardEscrowRepository.findTeacherEscrows(teacherId, pageable).map(row -> {
            var e = (com.elearning.emotion.entity.RewardEscrow) row[0];
            String title = (String) row[1];
            return new TeacherEscrowDto(e.getId(), e.getOrderId(), e.getCourseId(), title,
                    e.getAmount(), e.getStatus(), e.getHoldingUntil(), e.getSettledAt(), e.getCreatedAt());
        });
    }
}
