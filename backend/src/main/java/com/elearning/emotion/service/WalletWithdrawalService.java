package com.elearning.emotion.service;

import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.entity.WalletWithdrawal;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.repository.WalletWithdrawalRepository;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletWithdrawalService {

    private final StudentWalletService walletService;
    private final WalletWithdrawalRepository repo;
    private final WalletProperties walletProperties;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final RealtimePublisher realtimePublisher;

    public record BankInfo(String bankId, String accountNo, String accountName) {}

    @Transactional
    public WalletWithdrawal request(String userId, BigDecimal amount, BankInfo bank) {
        if (amount == null) {
            throw new IllegalArgumentException("Số tiền rút không được để trống");
        }
        if (bank == null || bank.accountNo() == null || bank.accountNo().isBlank()) {
            throw new IllegalArgumentException("Thông tin tài khoản ngân hàng không hợp lệ");
        }

        BigDecimal amt = amount.setScale(0, RoundingMode.HALF_UP);
        if (amt.compareTo(walletProperties.getMinWithdraw()) < 0) {
            throw new IllegalArgumentException("Số tiền rút tối thiểu là "
                    + String.format("%,d", walletProperties.getMinWithdraw().longValue()) + " đ");
        }

        walletService.lockOrCreate(userId); // khóa ví để các yêu cầu của một học viên chạy lần lượt

        if (repo.existsByUserIdAndStatus(userId, "PENDING")) {
            throw new IllegalArgumentException("Bạn đang có một yêu cầu rút tiền chờ xử lý");
        }

        WalletWithdrawal wd = repo.save(WalletWithdrawal.builder()
                .userId(userId)
                .amount(amt)
                .fromCash(BigDecimal.ZERO)
                .fromBonus(BigDecimal.ZERO)
                .bankId(bank.bankId() != null ? bank.bankId().trim() : "")
                .bankAccountNo(bank.accountNo().trim())
                .bankAccountName(bank.accountName() != null ? bank.accountName().trim().toUpperCase() : "")
                .status("PENDING")
                .build());

        var split = walletService.debitForWithdrawal(userId, amt, wd.getId());
        wd.setFromCash(split.fromCash());
        wd.setFromBonus(split.fromBonus());
        WalletWithdrawal saved = repo.save(wd);

        log.info("Student {} submitted withdrawal request #{} for {} VND (cash={}, bonus={})",
                userId, saved.getId(), amt, split.fromCash(), split.fromBonus());
        try {
            // Admin đang mở tab "Rút tiền" tự thấy yêu cầu mới, không cần reload
            realtimePublisher.publishToRole("ADMIN", "admin-stats",
                    java.util.Map.of("reason", "WITHDRAWAL_REQUESTED", "withdrawalId", saved.getId()));
        } catch (Exception ignored) { }
        return saved;
    }

    @Transactional
    public void markPaid(String adminId, String id, String transactionRef) {
        if (transactionRef == null || transactionRef.isBlank()) {
            throw new IllegalArgumentException("Bắt buộc nhập mã giao dịch ngân hàng");
        }

        WalletWithdrawal wd = repo.lockById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu rút tiền"));
        if (!"PENDING".equals(wd.getStatus())) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý trước đó");
        }

        wd.setStatus("PAID");
        wd.setTransactionRef(transactionRef.trim());
        wd.setProcessedBy(adminId);
        wd.setProcessedAt(LocalDateTime.now());
        repo.save(wd);

        User admin = userRepository.findById(adminId).orElse(null);
        auditService.log(admin, "PAY_WITHDRAWAL", "WALLET_WITHDRAWAL", id,
                "Xác nhận chuyển khoản rút tiền: " + transactionRef.trim());

        notificationService.send(
                wd.getUserId(),
                "Yêu cầu rút tiền thành công",
                "Yêu cầu rút " + String.format("%,d", wd.getAmount().longValue())
                        + " đ đã được chuyển khoản thành công tới tài khoản " + wd.getBankAccountNo()
                        + " (Mã GD: " + transactionRef.trim() + ").",
                "WALLET",
                wd.getId(),
                "/wallet"
        );

        log.info("Admin {} marked withdrawal #{} as PAID with txRef {}", adminId, id, transactionRef);
    }

    @Transactional
    public void reject(String adminId, String id, String note) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Bắt buộc nhập lý do từ chối");
        }

        WalletWithdrawal wd = repo.lockById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu rút tiền"));
        if (!"PENDING".equals(wd.getStatus())) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý trước đó");
        }

        walletService.reverseWithdrawal(wd.getUserId(), wd.getId(), wd.getFromCash(), wd.getFromBonus());

        wd.setStatus("REJECTED");
        wd.setAdminNote(note.trim());
        wd.setProcessedBy(adminId);
        wd.setProcessedAt(LocalDateTime.now());
        repo.save(wd);

        User admin = userRepository.findById(adminId).orElse(null);
        auditService.log(admin, "REJECT_WITHDRAWAL", "WALLET_WITHDRAWAL", id,
                "Từ chối yêu cầu rút tiền: " + note.trim());

        notificationService.send(
                wd.getUserId(),
                "Yêu cầu rút tiền bị từ chối",
                "Yêu cầu rút " + String.format("%,d", wd.getAmount().longValue())
                        + " đ bị từ chối: " + note.trim() + ". Số tiền đã được hoàn trả lại ví của bạn.",
                "WALLET",
                wd.getId(),
                "/wallet"
        );

        log.info("Admin {} rejected withdrawal #{} with note: {}", adminId, id, note);
    }
}
