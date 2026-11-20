package com.elearning.emotion.service;

import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.entity.PaymentTransaction;
import com.elearning.emotion.entity.StudentWallet;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.entity.WalletEntry;
import com.elearning.emotion.entity.WalletWithdrawal;
import com.elearning.emotion.repository.PaymentTransactionRepository;
import com.elearning.emotion.repository.StudentWalletRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.repository.WalletEntryRepository;
import com.elearning.emotion.repository.WalletWithdrawalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class Phase4StudentWalletTest {

    private StudentWalletRepository walletRepo;
    private WalletEntryRepository entryRepo;
    private StudentWalletCreator creator;
    private WalletProperties walletProperties;
    private StudentWalletService walletService;

    private PaymentTransactionRepository txRepo;
    private NotificationService notificationService;
    private AuditService auditService;
    private UserRepository userRepo;
    private WalletTopupService topupService;

    private WalletWithdrawalRepository withdrawalRepo;
    private WalletWithdrawalService withdrawalService;

    @BeforeEach
    void setUp() {
        walletRepo = mock(StudentWalletRepository.class);
        entryRepo = mock(WalletEntryRepository.class);
        creator = mock(StudentWalletCreator.class);
        walletProperties = new WalletProperties();
        walletProperties.setCashWithdrawHoldMonths(1);
        walletProperties.setMinWithdraw(BigDecimal.valueOf(50000));
        walletProperties.setWithdrawBonusAllowed(true);

        walletService = new StudentWalletService(walletRepo, entryRepo, creator, walletProperties);

        txRepo = mock(PaymentTransactionRepository.class);
        notificationService = mock(NotificationService.class);
        auditService = mock(AuditService.class);
        userRepo = mock(UserRepository.class);

        topupService = new WalletTopupService(
                walletRepo, entryRepo, txRepo, walletService, notificationService, auditService, userRepo
        );

        withdrawalRepo = mock(WalletWithdrawalRepository.class);
        withdrawalService = new WalletWithdrawalService(
                walletService, withdrawalRepo, walletProperties, auditService, notificationService, userRepo,
                mock(com.elearning.emotion.service.realtime.RealtimePublisher.class)
        );
    }

    @Test
    @DisplayName("4.1: Credit CASH and BONUS correctly updates balances and saves WalletEntry")
    void testCreditBalances() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(100000))
                .bonusBalance(BigDecimal.valueOf(20000))
                .build();
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        WalletEntry cashEntry = walletService.credit("u1", "TOPUP", "CASH", BigDecimal.valueOf(50000), "tx1", null, null, "Nap tien");
        assertEquals(BigDecimal.valueOf(150000), wallet.getCashBalance());
        assertEquals(BigDecimal.valueOf(150000), cashEntry.getCashAfter());

        WalletEntry bonusEntry = walletService.credit("u1", "REWARD", "BONUS", BigDecimal.valueOf(30000), null, null, "esc1", "Thuong");
        assertEquals(BigDecimal.valueOf(50000), wallet.getBonusBalance());
        assertEquals(BigDecimal.valueOf(50000), bonusEntry.getBonusAfter());
    }

    @Test
    @DisplayName("4.2: Debit for purchase uses BONUS first, then CASH, throws if insufficient")
    void testDebitForPurchase() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(300000))
                .bonusBalance(BigDecimal.valueOf(100000))
                .build();
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        // Mua khóa học 250,000 -> trừ 100,000 BONUS và 150,000 CASH
        List<WalletEntry> entries = walletService.debitForPurchase("u1", BigDecimal.valueOf(250000), "order1", "Mua khoa hoc");
        assertEquals(2, entries.size());
        assertEquals(BigDecimal.ZERO, wallet.getBonusBalance());
        assertEquals(BigDecimal.valueOf(150000), wallet.getCashBalance());

        // Mua tiếp 200,000 -> chỉ còn 150,000 CASH -> throws InsufficientBalanceException
        assertThrows(StudentWalletService.InsufficientBalanceException.class, () ->
                walletService.debitForPurchase("u1", BigDecimal.valueOf(200000), "order2", "Mua khoa hoc 2")
        );
    }

    @Test
    @DisplayName("4.3: Withdrawable calculation obeys 1-month hold rule for CASH and allows BONUS immediately")
    void testWithdrawableOneMonthRule() {
        // Ví có 1.000.000 CASH và 45.000 BONUS
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(1000000))
                .bonusBalance(BigDecimal.valueOf(45000))
                .build();

        // 400.000 được nạp trong vòng 1 tháng gần nhất
        when(entryRepo.sumRecentCashInflow(eq("u1"), any(LocalDateTime.class))).thenReturn(BigDecimal.valueOf(400000));
        when(entryRepo.firstRecentCashInflowAt(eq("u1"), any(LocalDateTime.class))).thenReturn(LocalDateTime.now().minusDays(5));

        StudentWalletService.Withdrawable can = walletService.withdrawable(wallet);

        // CASH có thể rút = 1.000.000 - 400.000 = 600.000
        assertEquals(BigDecimal.valueOf(600000), can.cash());
        assertEquals(BigDecimal.valueOf(400000), can.lockedCash());
        // BONUS rút ngay = 45.000
        assertEquals(BigDecimal.valueOf(45000), can.bonus());
        // Tổng có thể rút = 645.000
        assertEquals(BigDecimal.valueOf(645000), can.total());
    }

    @Test
    @DisplayName("4.4: Debit for withdrawal deducts BONUS first, then mature CASH")
    void testDebitForWithdrawal() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(1000000))
                .bonusBalance(BigDecimal.valueOf(45000))
                .build();

        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.sumRecentCashInflow(eq("u1"), any(LocalDateTime.class))).thenReturn(BigDecimal.valueOf(400000));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        // Rút 100.000: trừ 45.000 BONUS và 55.000 CASH
        StudentWalletService.Split split = walletService.debitForWithdrawal("u1", BigDecimal.valueOf(100000), "wd1");
        assertEquals(BigDecimal.valueOf(45000), split.fromBonus());
        assertEquals(BigDecimal.valueOf(55000), split.fromCash());

        assertEquals(BigDecimal.ZERO, wallet.getBonusBalance());
        assertEquals(BigDecimal.valueOf(945000), wallet.getCashBalance());

        // Rút vượt số có thể rút (còn 600.000 - 55.000 = 545.000) -> rút 600.000 bị từ chối
        assertThrows(IllegalArgumentException.class, () ->
                walletService.debitForWithdrawal("u1", BigDecimal.valueOf(600000), "wd2")
        );
    }

    @Test
    @DisplayName("4.5: Reverse withdrawal restores both CASH and BONUS")
    void testReverseWithdrawal() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(500000))
                .bonusBalance(BigDecimal.valueOf(0))
                .build();
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));

        walletService.reverseWithdrawal("u1", "wd1", BigDecimal.valueOf(55000), BigDecimal.valueOf(45000));

        assertEquals(BigDecimal.valueOf(555000), wallet.getCashBalance());
        assertEquals(BigDecimal.valueOf(45000), wallet.getBonusBalance());
        verify(entryRepo, times(2)).save(any(WalletEntry.class));
    }

    @Test
    @DisplayName("4.6: Admin adjustBalance supports positive and negative adjustments without negative balance")
    void testAdjustBalance() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(100000))
                .bonusBalance(BigDecimal.valueOf(50000))
                .build();
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        walletService.adjustBalance("u1", "CASH", BigDecimal.valueOf(20000), "Thuong them");
        assertEquals(BigDecimal.valueOf(120000), wallet.getCashBalance());

        walletService.adjustBalance("u1", "BONUS", BigDecimal.valueOf(-30000), "Giam thuong");
        assertEquals(BigDecimal.valueOf(20000), wallet.getBonusBalance());

        // Điều chỉnh giảm quá số dư -> ném lỗi
        assertThrows(IllegalArgumentException.class, () ->
                walletService.adjustBalance("u1", "BONUS", BigDecimal.valueOf(-50000), "Giam qua muc")
        );
    }

    @Test
    @DisplayName("4.7: WalletTopupService handles valid topup and rejects unknown code")
    void testWalletTopup() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx1")
                .transferAmount(BigDecimal.valueOf(200000))
                .build();

        // 1. Không tìm thấy mã nạp
        when(walletRepo.findByTopupCode("NAPUNKNOWN")).thenReturn(Optional.empty());
        Map<String, Object> resUnknown = topupService.handleTopup(tx, "NAPUNKNOWN", BigDecimal.valueOf(200000));
        assertEquals("UNMATCHED", tx.getStatus());

        // 2. Tìm thấy mã nạp
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.ZERO)
                .bonusBalance(BigDecimal.ZERO)
                .build();
        when(walletRepo.findByTopupCode("NAPABC12345")).thenReturn(Optional.of(wallet));
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.existsByPaymentTransactionIdAndType("tx1", "TOPUP")).thenReturn(false);
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> resSuccess = topupService.handleTopup(tx, "NAPABC12345", BigDecimal.valueOf(200000));
        assertEquals("MATCHED", tx.getStatus());
        assertEquals("TOPUP", tx.getKind());
        assertEquals("u1", tx.getTopupUserId());
        assertEquals(BigDecimal.valueOf(200000), wallet.getCashBalance());

        // 3. Webhook gửi lại cùng transaction id -> Idempotency
        when(entryRepo.existsByPaymentTransactionIdAndType("tx1", "TOPUP")).thenReturn(true);
        Map<String, Object> resDup = topupService.handleTopup(tx, "NAPABC12345", BigDecimal.valueOf(200000));
        assertEquals("Topup already credited", resDup.get("message"));
    }

    @Test
    @DisplayName("4.8: Withdrawal lifecycle: request -> markPaid / reject")
    void testWithdrawalLifecycle() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u1")
                .topupCode("NAPABC12345")
                .cashBalance(BigDecimal.valueOf(500000))
                .bonusBalance(BigDecimal.ZERO)
                .build();
        when(walletRepo.lockByUserId("u1")).thenReturn(Optional.of(wallet));
        when(entryRepo.sumRecentCashInflow(eq("u1"), any(LocalDateTime.class))).thenReturn(BigDecimal.ZERO);
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Gửi lệnh rút tiền
        when(withdrawalRepo.existsByUserIdAndStatus("u1", "PENDING")).thenReturn(false);
        when(withdrawalRepo.save(any(WalletWithdrawal.class))).thenAnswer(inv -> {
            WalletWithdrawal w = inv.getArgument(0);
            w.setId("wd-1");
            return w;
        });

        WalletWithdrawal wd = withdrawalService.request(
                "u1",
                BigDecimal.valueOf(100000),
                new WalletWithdrawalService.BankInfo("MB", "0123456789", "NGUYEN VAN A")
        );
        assertEquals("PENDING", wd.getStatus());
        assertEquals(BigDecimal.valueOf(400000), wallet.getCashBalance());

        // 2. Không cho phép gửi yêu cầu thứ hai khi đang có PENDING
        when(withdrawalRepo.existsByUserIdAndStatus("u1", "PENDING")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () ->
                withdrawalService.request("u1", BigDecimal.valueOf(50000),
                        new WalletWithdrawalService.BankInfo("MB", "0123456789", "NGUYEN VAN A"))
        );

        // 3. Admin xác nhận đã chuyển tiền (PAID)
        when(withdrawalRepo.lockById("wd-1")).thenReturn(Optional.of(wd));
        withdrawalService.markPaid("admin-1", "wd-1", "BANK-REF-999");
        assertEquals("PAID", wd.getStatus());
        assertEquals("BANK-REF-999", wd.getTransactionRef());

        // 4. Nếu reject một yêu cầu PENDING khác -> hoàn tiền về ví
        WalletWithdrawal wd2 = WalletWithdrawal.builder()
                .id("wd-2")
                .userId("u1")
                .amount(BigDecimal.valueOf(100000))
                .fromCash(BigDecimal.valueOf(100000))
                .fromBonus(BigDecimal.ZERO)
                .status("PENDING")
                .build();
        when(withdrawalRepo.lockById("wd-2")).thenReturn(Optional.of(wd2));

        withdrawalService.reject("admin-1", "wd-2", "Sai tên tài khoản ngân hàng");
        assertEquals("REJECTED", wd2.getStatus());
        assertEquals("Sai tên tài khoản ngân hàng", wd2.getAdminNote());
        assertEquals(BigDecimal.valueOf(500000), wallet.getCashBalance()); // hoàn lại 100.000
    }
}
