package com.elearning.emotion.service;

import com.elearning.emotion.entity.PaymentTransaction;
import com.elearning.emotion.entity.StudentWallet;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.PaymentTransactionRepository;
import com.elearning.emotion.repository.StudentWalletRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.repository.WalletEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletTopupService {

    private final StudentWalletRepository walletRepo;
    private final WalletEntryRepository entryRepo;
    private final PaymentTransactionRepository txRepo;
    private final StudentWalletService walletService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final UserRepository userRepo;

    @Transactional
    public Map<String, Object> handleTopup(PaymentTransaction tx, String topupCode, BigDecimal amount) {
        Optional<StudentWallet> wallet = walletRepo.findByTopupCode(topupCode);
        if (wallet.isEmpty()) {
            tx.setStatus("UNMATCHED");
            tx.setAdminNote("Không tìm thấy ví với mã nạp " + topupCode);
            txRepo.save(tx);
            log.warn("Topup code {} not found in system, marked as UNMATCHED", topupCode);
            return Map.of("success", true, "message", "Topup code not found, recorded as UNMATCHED");
        }

        String userId = wallet.get().getUserId();

        // Chống cộng trùng khi SePay gửi lại webhook (sepay_id đã unique, đây là lớp bảo vệ thứ hai)
        if (entryRepo.existsByPaymentTransactionIdAndType(tx.getId(), "TOPUP")) {
            log.info("Topup transaction {} already credited. Skipping duplicate.", tx.getId());
            return Map.of("success", true, "message", "Topup already credited");
        }

        tx.setKind("TOPUP");
        tx.setTopupUserId(userId);
        tx.setStatus("MATCHED");
        tx.setAdminNote("Nạp ví tự động qua webhook SePay");
        txRepo.save(tx);

        walletService.credit(userId, "TOPUP", "CASH", amount, tx.getId(), null, null,
                "Nạp tiền qua chuyển khoản (mã " + topupCode + ")");

        notificationService.send(userId, "Nạp tiền thành công",
                "Ví của bạn vừa được cộng " + String.format("%,d", amount.longValue()) + " đ.",
                "WALLET", tx.getId(), "/wallet");

        log.info("Successfully credited {} VND to user {} via topup code {}", amount, userId, topupCode);
        return Map.of("success", true, "status", "MATCHED", "type", "TOPUP");
    }

    @Transactional
    public Map<String, Object> creditToOrderOwner(PaymentTransaction tx, com.elearning.emotion.entity.Order order, BigDecimal amount, String note) {
        String userId = order.getUser().getId();
        if (entryRepo.existsByPaymentTransactionIdAndType(tx.getId(), "TOPUP")) {
            return Map.of("success", true, "message", "Already credited");
        }
        tx.setKind("TOPUP");
        tx.setTopupUserId(userId);
        tx.setOrder(order);
        tx.setStatus("MATCHED");
        tx.setAdminNote(note);
        txRepo.save(tx);

        walletService.credit(userId, "TOPUP", "CASH", amount, tx.getId(), null, null,
                "Nạp ví từ chuyển khoản theo đơn " + order.getOrderCode());

        notificationService.send(userId, "Tiền đã được cộng vào ví",
                "Ví của bạn vừa được cộng " + String.format("%,d", amount.longValue())
                        + " đ. Hãy bấm Thanh toán bằng ví để đăng ký khóa học.",
                "WALLET", tx.getId(), "/wallet");

        log.info("Credited {} VND to user {} via legacy order code {}", amount, userId, order.getOrderCode());
        return Map.of("success", true, "status", "MATCHED", "type", "TOPUP");
    }

    @Transactional
    public void manualTopup(String adminId, String txId, String userId, String note) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Bắt buộc nhập ghi chú đối soát");
        }
        PaymentTransaction tx = txRepo.findById(txId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giao dịch ngân hàng"));
        if ("MATCHED".equals(tx.getStatus())) {
            throw new IllegalArgumentException("Giao dịch này đã được khớp trước đó");
        }

        BigDecimal amount = tx.getTransferAmount() != null
                ? tx.getTransferAmount().setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Số tiền giao dịch không hợp lệ");
        }

        tx.setKind("TOPUP");
        tx.setTopupUserId(userId);
        tx.setStatus("MATCHED");
        tx.setAdminNote("Khớp thủ công bởi admin: " + note.trim());
        txRepo.save(tx);

        walletService.credit(userId, "TOPUP", "CASH", amount,
                tx.getId(), null, null, "Nạp tiền (khớp thủ công)");

        User admin = userRepo.findById(adminId).orElse(null);
        auditService.log(admin, "MANUAL_TOPUP", "PAYMENT_TRANSACTION", txId, note.trim());

        notificationService.send(userId, "Nạp tiền thành công",
                "Giao dịch của bạn đã được admin đối soát thành công. Ví của bạn vừa được cộng "
                        + String.format("%,d", amount.longValue()) + " đ.",
                "WALLET", tx.getId(), "/wallet");

        log.info("Admin {} manually credited {} VND to user {} for tx {}", adminId, amount, userId, txId);
    }
}
