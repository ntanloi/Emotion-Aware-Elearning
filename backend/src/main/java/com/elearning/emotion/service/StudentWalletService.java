package com.elearning.emotion.service;

import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.entity.StudentWallet;
import com.elearning.emotion.entity.WalletEntry;
import com.elearning.emotion.repository.StudentWalletRepository;
import com.elearning.emotion.repository.WalletEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentWalletService {

    private final StudentWalletRepository walletRepo;
    private final WalletEntryRepository entryRepo;
    private final StudentWalletCreator creator;
    private final WalletProperties walletProperties;

    public static class InsufficientBalanceException extends RuntimeException {
        public final BigDecimal shortfall;

        public InsufficientBalanceException(BigDecimal shortfall) {
            super("Số dư không đủ, còn thiếu " + String.format("%,d", shortfall.longValue()) + " đ");
            this.shortfall = shortfall;
        }
    }

    public record Split(BigDecimal fromCash, BigDecimal fromBonus) {}

    public record Withdrawable(BigDecimal bonus, BigDecimal cash, BigDecimal lockedCash, LocalDateTime nextUnlockAt) {
        public BigDecimal total() {
            return bonus.add(cash);
        }
    }

    /** Lấy ví và khóa hàng để cộng trừ an toàn. Tạo ví nếu chưa có. */
    @Transactional
    public StudentWallet lockOrCreate(String userId) {
        Optional<StudentWallet> w = walletRepo.lockByUserId(userId);
        if (w.isPresent()) return w.get();

        for (int i = 0; i < 5; i++) {
            try {
                creator.createIfAbsent(userId);
                break;
            } catch (DataIntegrityViolationException ignored) {
            }
        }
        return walletRepo.lockByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Không tạo được ví cho học viên: " + userId));
    }

    /** Lấy hoặc tạo ví không khóa bi quan (dùng cho API xem thông tin ví). */
    @Transactional
    public StudentWallet getOrCreate(String userId) {
        Optional<StudentWallet> w = walletRepo.findById(userId);
        if (w.isPresent()) return w.get();

        for (int i = 0; i < 5; i++) {
            try {
                creator.createIfAbsent(userId);
                break;
            } catch (DataIntegrityViolationException ignored) {
            }
        }
        return walletRepo.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Không tạo được ví cho học viên: " + userId));
    }

    @Transactional
    public WalletEntry credit(String userId, String type, String bucket, BigDecimal amount,
                              String paymentTxId, String orderId, String escrowId, String description) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }
        StudentWallet w = lockOrCreate(userId);
        if ("BONUS".equalsIgnoreCase(bucket)) {
            w.setBonusBalance(w.getBonusBalance().add(amount));
        } else {
            w.setCashBalance(w.getCashBalance().add(amount));
        }
        walletRepo.save(w);
        return entryRepo.save(newEntry(w, type, bucket.toUpperCase(), amount, paymentTxId, orderId, escrowId, null, description));
    }

    /** Trừ tiền mua khóa: dùng BONUS trước, thiếu thì lấy CASH. */
    @Transactional
    public List<WalletEntry> debitForPurchase(String userId, BigDecimal price, String orderId, String description) {
        StudentWallet w = lockOrCreate(userId);
        BigDecimal total = w.getCashBalance().add(w.getBonusBalance());
        if (total.compareTo(price) < 0) {
            throw new InsufficientBalanceException(price.subtract(total));
        }
        BigDecimal fromBonus = w.getBonusBalance().min(price);
        BigDecimal fromCash = price.subtract(fromBonus);
        List<WalletEntry> out = new ArrayList<>();
        if (fromBonus.signum() > 0) {
            w.setBonusBalance(w.getBonusBalance().subtract(fromBonus));
            out.add(entryRepo.save(newEntry(w, "PURCHASE", "BONUS", fromBonus.negate(), null, orderId, null, null, description)));
        }
        if (fromCash.signum() > 0) {
            w.setCashBalance(w.getCashBalance().subtract(fromCash));
            out.add(entryRepo.save(newEntry(w, "PURCHASE", "CASH", fromCash.negate(), null, orderId, null, null, description)));
        }
        walletRepo.save(w);
        return out;
    }

    /** Số có thể rút ngay: toàn bộ BONUS (nếu được phép) cộng phần CASH đã nằm trong ví từ 1 tháng trở lên. */
    public Withdrawable withdrawable(StudentWallet w) {
        int months = walletProperties.getCashWithdrawHoldMonths();
        LocalDateTime since = LocalDateTime.now().minusMonths(months);
        BigDecimal recentIn = entryRepo.sumRecentCashInflow(w.getUserId(), since);
        if (recentIn == null) recentIn = BigDecimal.ZERO;
        BigDecimal cash = w.getCashBalance().subtract(recentIn).max(BigDecimal.ZERO);
        BigDecimal locked = w.getCashBalance().subtract(cash);
        BigDecimal bonus = walletProperties.isWithdrawBonusAllowed() ? w.getBonusBalance() : BigDecimal.ZERO;
        LocalDateTime first = locked.signum() > 0 ? entryRepo.firstRecentCashInflowAt(w.getUserId(), since) : null;
        return new Withdrawable(bonus, cash, locked, first == null ? null : first.plusMonths(months));
    }

    /** Trừ số dư khi học viên gửi lệnh rút. Rút BONUS trước, thiếu thì lấy phần CASH đã đủ 1 tháng. */
    @Transactional
    public Split debitForWithdrawal(String userId, BigDecimal amount, String withdrawalId) {
        StudentWallet w = lockOrCreate(userId);
        Withdrawable can = withdrawable(w);
        if (can.total().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Số tiền có thể rút hiện tại là "
                    + String.format("%,d", can.total().longValue())
                    + " đ (tiền thưởng và tiền nạp đã nằm trong ví đủ " + walletProperties.getCashWithdrawHoldMonths() + " tháng)");
        }
        BigDecimal fromBonus = can.bonus().min(amount);
        BigDecimal fromCash = amount.subtract(fromBonus);
        if (fromBonus.signum() > 0) {
            w.setBonusBalance(w.getBonusBalance().subtract(fromBonus));
            entryRepo.save(newEntry(w, "WITHDRAW", "BONUS", fromBonus.negate(), null, null, null, withdrawalId, "Rút tiền về tài khoản ngân hàng"));
        }
        if (fromCash.signum() > 0) {
            w.setCashBalance(w.getCashBalance().subtract(fromCash));
            entryRepo.save(newEntry(w, "WITHDRAW", "CASH", fromCash.negate(), null, null, null, withdrawalId, "Rút tiền về tài khoản ngân hàng"));
        }
        walletRepo.save(w);
        return new Split(fromCash, fromBonus);
    }

    /** Hoàn lại khi admin từ chối: cộng đúng hai ngăn đã trừ, ghi WITHDRAW_REVERSE. */
    @Transactional
    public void reverseWithdrawal(String userId, String withdrawalId, BigDecimal fromCash, BigDecimal fromBonus) {
        StudentWallet w = lockOrCreate(userId);
        if (fromBonus != null && fromBonus.signum() > 0) {
            w.setBonusBalance(w.getBonusBalance().add(fromBonus));
            entryRepo.save(newEntry(w, "WITHDRAW_REVERSE", "BONUS", fromBonus, null, null, null, withdrawalId, "Hoàn lại lệnh rút tiền bị từ chối"));
        }
        if (fromCash != null && fromCash.signum() > 0) {
            w.setCashBalance(w.getCashBalance().add(fromCash));
            entryRepo.save(newEntry(w, "WITHDRAW_REVERSE", "CASH", fromCash, null, null, null, withdrawalId, "Hoàn lại lệnh rút tiền bị từ chối"));
        }
        walletRepo.save(w);
    }

    /** Điều chỉnh số dư bởi Quản trị viên (loại ADJUST, có thể âm hoặc dương). */
    @Transactional
    public WalletEntry adjustBalance(String userId, String bucket, BigDecimal amount, String description) {
        if (amount == null || amount.signum() == 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh không được bằng 0");
        }
        StudentWallet w = lockOrCreate(userId);
        if ("BONUS".equalsIgnoreCase(bucket)) {
            BigDecimal newBonus = w.getBonusBalance().add(amount);
            if (newBonus.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Số dư tiền thưởng không đủ để điều chỉnh giảm");
            }
            w.setBonusBalance(newBonus);
        } else {
            BigDecimal newCash = w.getCashBalance().add(amount);
            if (newCash.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Số dư tiền mặt không đủ để điều chỉnh giảm");
            }
            w.setCashBalance(newCash);
        }
        walletRepo.save(w);
        return entryRepo.save(newEntry(w, "ADJUST", bucket.toUpperCase(), amount, null, null, null, null, description));
    }

    private WalletEntry newEntry(StudentWallet w, String type, String bucket, BigDecimal amount,
                                 String paymentTxId, String orderId, String escrowId, String withdrawalId,
                                 String description) {
        return WalletEntry.builder()
                .userId(w.getUserId())
                .type(type)
                .bucket(bucket)
                .amount(amount)
                .cashAfter(w.getCashBalance())
                .bonusAfter(w.getBonusBalance())
                .paymentTransactionId(paymentTxId)
                .orderId(orderId)
                .escrowId(escrowId)
                .withdrawalId(withdrawalId)
                .description(description)
                .build();
    }
}
