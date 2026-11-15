package com.elearning.emotion.service;

import com.elearning.emotion.entity.RewardEscrow;
import com.elearning.emotion.entity.TeacherWalletEntry;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardSettlementService {

    private final RewardEscrowRepository escrowRepo;
    private final VideoViewAttemptRepository attemptRepo;
    private final StudentWalletService walletService;
    private final TeacherWalletEntryRepository teacherWalletRepo;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Xét một escrow: đủ điều kiện thì cộng thưởng cho học viên.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void evaluate(String escrowId) {
        RewardEscrow e = escrowRepo.lockById(escrowId).orElse(null);
        if (e == null || !"HOLDING".equals(e.getStatus())) {
            return; // Đã quyết toán rồi
        }
        if (isEligible(e)) {
            claim(e);
        }
    }

    /**
     * Dùng cho job hằng đêm: hết hạn giữ thì quyết toán nốt.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleIfExpired(String escrowId) {
        RewardEscrow e = escrowRepo.lockById(escrowId).orElse(null);
        if (e == null || !"HOLDING".equals(e.getStatus())) {
            return;
        }
        if (e.getHoldingUntil() != null && e.getHoldingUntil().isAfter(LocalDateTime.now())) {
            return;
        }
        if (isEligible(e)) {
            claim(e); // Đủ điều kiện nhưng chưa được xét: ưu tiên học viên
        } else {
            release(e);
        }
    }

    public boolean isEligible(RewardEscrow e) {
        int total = escrowRepo.countExistingVideos(e.getId());
        if (total == 0) {
            return false; // Mọi video đã bị xóa: không thể đạt, sẽ chuyển cho giảng viên khi hết hạn
        }
        int valid = attemptRepo.countValidVideos(e.getId(), e.getUserId(), e.getCreatedAt());
        // valid / total >= required% , so sánh bằng số nguyên để tránh sai số
        return BigDecimal.valueOf(valid).multiply(BigDecimal.valueOf(100))
                .compareTo(e.getRequiredPercent().multiply(BigDecimal.valueOf(total))) >= 0;
    }

    public void claim(RewardEscrow e) {
        BigDecimal amt = e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO;
        walletService.credit(e.getUserId(), "REWARD", "BONUS", amt,
                null, e.getOrderId(), e.getId(), "Thưởng hoàn thành khóa học (đủ video xem hợp lệ)");
        e.setStatus("CLAIMED");
        e.setSettledAt(LocalDateTime.now());
        escrowRepo.save(e);
        notificationService.send(e.getUserId(), "Bạn đã nhận thưởng!",
                "Ví của bạn vừa được cộng " + String.format("%,d", amt.longValue())
                        + " đ tiền thưởng. Tiền thưởng dùng để mua khóa học khác và không có hạn sử dụng.",
                "WALLET", e.getId(), "/wallet");
        log.info("Claimed reward escrow #{} of amount {} for student {}", e.getId(), amt, e.getUserId());
    }

    public void release(RewardEscrow e) {
        BigDecimal amt = e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO;
        teacherWalletRepo.save(TeacherWalletEntry.builder()
                .teacher(userRepository.getReferenceById(e.getTeacherId()))
                .order(orderRepository.getReferenceById(e.getOrderId()))
                .type("REWARD_RELEASE")
                .amount(amt)
                .availableAt(LocalDateTime.now()) // Khả dụng ngay, giống SALE
                .description("Nhận phần giữ hộ 10% vì học viên chưa đạt điều kiện thưởng")
                .build());
        e.setStatus("RELEASED");
        e.setSettledAt(LocalDateTime.now());
        escrowRepo.save(e);
        notificationService.send(e.getTeacherId(), "Nhận thêm tiền giữ hộ",
                "Bạn được cộng " + String.format("%,d", amt.longValue()) + " đ do học viên không đạt điều kiện thưởng.",
                "FINANCE", e.getOrderId(), "/teacher/dashboard");
        log.info("Released reward escrow #{} of amount {} to teacher {}", e.getId(), amt, e.getTeacherId());
    }
}
