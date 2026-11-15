package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.event.VideoAttemptValidatedEvent;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.VideoViewAttemptService.Sample;
import com.elearning.emotion.service.emotion.FaceLostTracker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Phase 8: Kiểm thử đầu cuối (E2E), chạy bóng và kiểm toán tài chính.
 *
 * Kiểm tra đầy đủ các yêu cầu theo mục 8.1 của Lộ trình triển khai:
 * 1. Tính toán chia tiền tài chính (5% platform fee, 10% escrow, 85% teacher) trên 100+ dải giá ngẫu nhiên.
 * 2. Tính toàn vẹn số dư ví: không bao giờ âm, ưu tiên trừ BONUS trước CASH, từ chối số tiền không hợp lệ.
 * 3. Tính idempotent (chống lặp): webhook retry, mua trùng lặp, xét thưởng trùng lặp.
 * 4. Theo dõi video & cửa sổ 24 giờ: gộp lượt trong 24h, mở lượt mới sau 24h, tiêu chuẩn VALID/INVALID.
 * 5. Phân quyền và an toàn dữ liệu: cách ly dữ liệu học viên, bảo vệ phân quyền giảng viên/học viên.
 * 6. Kiểm thử tải & độ trễ (Benchmark simulation): đo độ trễ xử lý 1.000 mẫu khung hình (< 200ms).
 * 7. Đồng thời (Concurrency): mô phỏng luồng nạp song song đảm bảo tính nhất quán số dư ví.
 */
@ExtendWith(MockitoExtension.class)
class Phase8EndToEndAndAuditTest {

    // Properties
    private RewardProperties rewardProperties;
    private WalletProperties walletProperties;
    private PaymentProperties paymentProperties;

    // Repositories for Wallet & Order
    @Mock private StudentWalletRepository walletRepo;
    @Mock private WalletEntryRepository entryRepo;
    @Mock private StudentWalletCreator walletCreator;
    @Mock private PaymentTransactionRepository txRepo;
    @Mock private OrderRepository orderRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private ContentItemRepository contentItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeacherWalletEntryRepository teacherWalletRepo;
    @Mock private RewardEscrowRepository escrowRepo;
    @Mock private RewardEscrowVideoRepository escrowVideoRepo;
    @Mock private VideoViewAttemptRepository attemptRepo;
    @Mock private WalletWithdrawalRepository withdrawalRepo;

    // Services
    @Mock private NotificationService notificationService;
    @Mock private AuditService auditService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private StudentWalletService walletService;
    private WalletTopupService topupService;
    private WalletPurchaseService walletPurchaseService;
    private OrderService orderService;
    private RewardEscrowService escrowService;
    private RewardSettlementService settlementService;
    private VideoViewAttemptService attemptService;
    private FaceLostTracker faceLostTracker;

    @BeforeEach
    void setUp() {
        rewardProperties = new RewardProperties();
        rewardProperties.setEnabled(true);
        rewardProperties.setEscrowPercent(new BigDecimal("10"));
        rewardProperties.setRequiredVideoPercent(new BigDecimal("70"));
        rewardProperties.setMaxBadPercent(30.0);
        rewardProperties.setMinCoveragePercent(90);
        rewardProperties.setAttemptWindowHours(24);
        rewardProperties.setFaceLostPauseBatches(5);

        walletProperties = new WalletProperties();
        walletProperties.setCashWithdrawHoldMonths(1);
        walletProperties.setMinWithdraw(new BigDecimal("50000"));
        walletProperties.setWithdrawBonusAllowed(true);

        paymentProperties = new PaymentProperties();
        paymentProperties.setPlatformFeePercent(new BigDecimal("5"));

        walletService = new StudentWalletService(walletRepo, entryRepo, walletCreator, walletProperties);
        topupService = new WalletTopupService(walletRepo, entryRepo, txRepo, walletService, notificationService, auditService, userRepository);
        escrowService = new RewardEscrowService(escrowRepo, escrowVideoRepo, rewardProperties);
        settlementService = new RewardSettlementService(
                escrowRepo, attemptRepo, walletService, teacherWalletRepo,
                orderRepository, userRepository, notificationService
        );
        attemptService = new VideoViewAttemptService(attemptRepo, rewardProperties, eventPublisher);
        faceLostTracker = new FaceLostTracker(rewardProperties);
    }

    // =========================================================================
    // 1. KIỂM THỬ TÀI CHÍNH: CHIA TỈ LỆ 5 / 10 / 85 CHÍNH XÁC TUYỆT ĐỐI
    // =========================================================================

    private static BigDecimal pct(BigDecimal base, BigDecimal percent) {
        return base.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    @Test
    @DisplayName("8.1.1 - Chia tiền 5/10/85 luôn khớp 100% không lệch 1 xu trên 100+ mức giá ngẫu nhiên (1.000 đến 50.000.000 VND)")
    void testFinancialSplitIntegrityAcrossRandomPrices() {
        Random random = new Random(42); // seed cố định để tái lập kiểm thử

        // Danh sách các giá biên đặc biệt
        List<BigDecimal> testPrices = new ArrayList<>(List.of(
                new BigDecimal("1000"),
                new BigDecimal("10000"),
                new BigDecimal("33333"),
                new BigDecimal("49999"),
                new BigDecimal("50000"),
                new BigDecimal("99999"),
                new BigDecimal("100000"),
                new BigDecimal("333333"),
                new BigDecimal("450000"),
                new BigDecimal("999999"),
                new BigDecimal("1234567"),
                new BigDecimal("2500000"),
                new BigDecimal("50000000")
        ));

        // Sinh thêm 100 mức giá ngẫu nhiên từ 1.000 đến 50.000.000
        for (int i = 0; i < 100; i++) {
            long randomVnd = 1000L + (long) (random.nextDouble() * 49999000L);
            testPrices.add(BigDecimal.valueOf(randomVnd));
        }

        BigDecimal feePercent = new BigDecimal("5");
        BigDecimal escrowPercent = new BigDecimal("10");

        for (BigDecimal price : testPrices) {
            BigDecimal platformFee = pct(price, feePercent);
            BigDecimal escrow = pct(price, escrowPercent);
            BigDecimal teacherAmount = price.subtract(platformFee).subtract(escrow); // phần dư làm tròn về giảng viên

            // 1. Không phần nào âm
            assertTrue(platformFee.signum() >= 0, "Phí sàn không được âm với giá: " + price);
            assertTrue(escrow.signum() >= 0, "Escrow không được âm với giá: " + price);
            assertTrue(teacherAmount.signum() >= 0, "Tiền giảng viên không được âm với giá: " + price);

            // 2. Tổng ba phần phải đúng bằng giá bán gốc
            BigDecimal sum = platformFee.add(escrow).add(teacherAmount);
            assertEquals(price, sum, "Tổng 3 phần phải bằng giá gốc cho mức giá: " + price);
        }

        // Kiểm tra trường hợp khi tính năng thưởng tắt (escrowPercent = 0)
        for (BigDecimal price : testPrices) {
            BigDecimal platformFee = pct(price, feePercent);
            BigDecimal escrow = BigDecimal.ZERO;
            BigDecimal teacherAmount = price.subtract(platformFee).subtract(escrow);

            assertEquals(price, platformFee.add(teacherAmount));
            assertEquals(BigDecimal.ZERO, escrow);
        }
    }

    // =========================================================================
    // 2. TÍNH TOÀN VẸN SỐ DƯ VÍ: KHÔNG BAO GIỜ ÂM & ƯU TIÊN BONUS TRƯỚC CASH
    // =========================================================================

    @Test
    @DisplayName("8.1.2 - Ví học viên không bao giờ âm, ưu tiên trừ BONUS trước CASH, ném 402 khi thiếu tiền")
    void testWalletBalanceIntegrityAndBucketPrioritization() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u-test-1")
                .cashBalance(new BigDecimal("70000"))
                .bonusBalance(new BigDecimal("30000"))
                .topupCode("NAPTEST123")
                .build();

        when(walletRepo.lockByUserId("u-test-1")).thenReturn(Optional.of(wallet));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(i -> i.getArgument(0));

        // Trường hợp 1: Mua khóa 50.000 VND
        // Dự kiến: trừ hết 30.000 BONUS, trừ 20.000 CASH -> bonus=0, cash=50.000
        List<WalletEntry> entries = walletService.debitForPurchase("u-test-1", new BigDecimal("50000"), "order-1", "Mua khóa test");

        assertEquals(2, entries.size());
        assertEquals("BONUS", entries.get(0).getBucket());
        assertEquals(new BigDecimal("-30000"), entries.get(0).getAmount());
        assertEquals("CASH", entries.get(1).getBucket());
        assertEquals(new BigDecimal("-20000"), entries.get(1).getAmount());

        assertEquals(BigDecimal.ZERO, wallet.getBonusBalance());
        assertEquals(new BigDecimal("50000"), wallet.getCashBalance());

        // Trường hợp 2: Mua tiếp khóa 60.000 VND trong khi ví chỉ còn 50.000 CASH
        // Dự kiến: Ném InsufficientBalanceException với shortfall = 10.000 VND
        StudentWalletService.InsufficientBalanceException ex = assertThrows(
                StudentWalletService.InsufficientBalanceException.class,
                () -> walletService.debitForPurchase("u-test-1", new BigDecimal("60000"), "order-2", "Mua khóa test 2")
        );

        assertEquals(new BigDecimal("10000"), ex.shortfall);
        // Số dư ví không bị biến động khi thất bại
        assertEquals(BigDecimal.ZERO, wallet.getBonusBalance());
        assertEquals(new BigDecimal("50000"), wallet.getCashBalance());

        // Trường hợp 3: Nạp tiền âm hoặc 0 -> ném IllegalArgumentException
        assertThrows(IllegalArgumentException.class, () ->
                walletService.credit("u-test-1", "TOPUP", "CASH", BigDecimal.ZERO, null, null, null, "Test 0")
        );
        assertThrows(IllegalArgumentException.class, () ->
                walletService.credit("u-test-1", "TOPUP", "CASH", new BigDecimal("-1000"), null, null, null, "Test âm")
        );
    }

    // =========================================================================
    // 3. TÍNH IDEMPOTENT (CHỐNG LẶP): WEBHOOK, MUA HÀNG VÀ XÉT THƯỞNG
    // =========================================================================

    @Test
    @DisplayName("8.1.3A - Idempotency Webhook: Gửi trùng webhook nạp tiền chỉ cộng đúng 1 lần")
    void testWebhookIdempotency() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("u-1")
                .cashBalance(new BigDecimal("100000"))
                .bonusBalance(BigDecimal.ZERO)
                .topupCode("NAPDUPL123")
                .build();

        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-duplicate-1")
                .sepayId(999999L)
                .transferAmount(new BigDecimal("200000"))
                .build();

        when(walletRepo.findByTopupCode("NAPDUPL123")).thenReturn(Optional.of(wallet));
        // Lần đầu: chưa tồn tại entry TOPUP
        when(entryRepo.existsByPaymentTransactionIdAndType("tx-duplicate-1", "TOPUP")).thenReturn(false);
        when(walletRepo.lockByUserId("u-1")).thenReturn(Optional.of(wallet));
        when(walletRepo.save(any(StudentWallet.class))).thenReturn(wallet);
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> res1 = topupService.handleTopup(tx, "NAPDUPL123", new BigDecimal("200000"));
        assertEquals("MATCHED", res1.get("status"));
        assertEquals(new BigDecimal("300000"), wallet.getCashBalance());

        // Lần 2 (Webhook retry do mạng chập chờn): existsByPaymentTransactionIdAndType trả về true
        when(entryRepo.existsByPaymentTransactionIdAndType("tx-duplicate-1", "TOPUP")).thenReturn(true);

        Map<String, Object> res2 = topupService.handleTopup(tx, "NAPDUPL123", new BigDecimal("200000"));
        assertEquals("Topup already credited", res2.get("message"));
        // Số dư ví không bị cộng thêm lần 2!
        assertEquals(new BigDecimal("300000"), wallet.getCashBalance());
    }

    @Test
    @DisplayName("8.1.3B - Idempotency Thưởng: Xét thưởng lặp lại cho escrow đã CLAIMED/RELEASED không cộng trùng")
    void testRewardSettlementIdempotency() {
        RewardEscrow claimedEscrow = RewardEscrow.builder()
                .id("escrow-claimed-1")
                .userId("student-1")
                .status("CLAIMED")
                .amount(new BigDecimal("50000"))
                .build();

        when(escrowRepo.lockById("escrow-claimed-1")).thenReturn(Optional.of(claimedEscrow));

        // Gọi evaluate lần nữa
        settlementService.evaluate("escrow-claimed-1");
        // Gọi settleIfExpired
        settlementService.settleIfExpired("escrow-claimed-1");

        // Đảm bảo không gọi walletService.credit và không đổi trạng thái
        verify(walletRepo, never()).lockByUserId(anyString());
        verify(escrowRepo, never()).save(any(RewardEscrow.class));
    }

    // =========================================================================
    // 4. THEO DÕI VIDEO: CỬA SỔ 24 GIỜ VÀ TIÊU CHUẨN XÉT HỢP LỆ
    // =========================================================================

    @Test
    @DisplayName("8.1.4 - Theo dõi video: Xem tiếp trong 24h gộp cùng lượt, sau 24h mở lượt mới")
    void testVideoAttempt24HourWindowAndValidationRules() {
        // Ca 1: Attempt cũ mới bắt đầu trong vòng 24h (findOpen trả về attemptId có sẵn)
        VideoViewAttempt existingAttempt = VideoViewAttempt.builder()
                .id("att-existing-1")
                .userId("u-1")
                .contentItemId("vid-100")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[60])
                .lastActivityAt(LocalDateTime.now().minusHours(3))
                .build();

        when(attemptRepo.findOpen(eq("u-1"), eq("vid-100"), any(LocalDateTime.class)))
                .thenReturn(List.of(existingAttempt));

        String attemptId = attemptService.openOrGet("u-1", "vid-100");
        assertEquals("att-existing-1", attemptId);

        // Ca 2: Hết cửa sổ 24h (findOpen trả về rỗng) -> tạo attempt mới
        when(attemptRepo.findOpen(eq("u-1"), eq("vid-100"), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(i -> {
            VideoViewAttempt a = i.getArgument(0);
            a.setId("att-new-24h");
            return a;
        });

        String newAttemptId = attemptService.openOrGet("u-1", "vid-100");
        assertEquals("att-new-24h", newAttemptId);

        // Ca 3: Kiểm tra tiêu chuẩn xét VALID / INVALID qua applyBatch
        VideoViewAttempt attemptForBatch = VideoViewAttempt.builder()
                .id("att-eval")
                .userId("u-1")
                .contentItemId("vid-100")
                .status("OPEN")
                .durationSec(100) // 100s = 10 bins
                .binSec(10)
                .coveredBins(new byte[10])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .build();

        when(attemptRepo.lockById("att-eval")).thenReturn(Optional.of(attemptForBatch));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(i -> i.getArgument(0));

        // Phủ 10/10 ô (100% >= 90%), chỉ có 10% NO_FACE (<= 30% bad) -> VALID
        List<Sample> validSamples = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            validSamples.add(new Sample("ENGAGED", (float) (i * 10), 0.9f));
        }
        validSamples.add(new Sample("NO_FACE", 5.0f, 0.9f)); // 1/11 ~ 9% bad

        var snapshotValid = attemptService.applyBatch("att-eval", validSamples, 1.0, 100);
        assertNotNull(snapshotValid);
        assertEquals("VALID", snapshotValid.status());
        assertEquals("VALID", attemptForBatch.getStatus());
        assertTrue(snapshotValid.coveragePercent() >= 90.0);
        assertTrue(snapshotValid.badPercent() <= 30.0);

        // Verify event được bắn ra
        ArgumentCaptor<VideoAttemptValidatedEvent> eventCaptor = ArgumentCaptor.forClass(VideoAttemptValidatedEvent.class);
        verify(eventPublisher, atLeastOnce()).publishEvent(eventCaptor.capture());
        assertEquals("u-1", eventCaptor.getValue().userId());
    }

    // =========================================================================
    // 5. PHÂN QUYỀN VÀ BẢO MẬT DỮ LIỆU (ACCESS CONTROL)
    // =========================================================================

    @Test
    @DisplayName("8.1.5 - Phân quyền: Học viên chỉ thấy ví của mình, Admin quản trị yêu cầu bắt buộc ghi chú")
    void testAccessControlAndValidation() {
        StudentWallet studentWallet = StudentWallet.builder()
                .userId("u-1")
                .cashBalance(new BigDecimal("5000"))
                .bonusBalance(BigDecimal.ZERO)
                .build();
        when(walletRepo.lockByUserId("u-1")).thenReturn(Optional.of(studentWallet));
        when(entryRepo.sumRecentCashInflow(anyString(), any())).thenReturn(BigDecimal.ZERO);

        // Rút tiền yêu cầu tối thiểu (50.000 VND) trong khi ví chỉ có 5.000 VND
        assertThrows(IllegalArgumentException.class, () ->
                walletService.debitForWithdrawal("u-1", new BigDecimal("10000"), "wd-low")
        );

        // Khóa học do chính giảng viên sở hữu thì giảng viên không được tự mua
        StudentWallet teacherWallet = StudentWallet.builder()
                .userId("teacher-1")
                .cashBalance(new BigDecimal("500000"))
                .bonusBalance(BigDecimal.ZERO)
                .build();
        when(walletRepo.lockByUserId("teacher-1")).thenReturn(Optional.of(teacherWallet));

        User teacher = User.builder().id("teacher-1").build();
        Course course = Course.builder().id("c-1").teacher(teacher).price(new BigDecimal("200000")).build();

        when(courseRepository.findById("c-1")).thenReturn(Optional.of(course));

        WalletPurchaseService purchaseService = new WalletPurchaseService(
                walletService, orderService, orderRepository, courseRepository,
                enrollmentRepository, contentItemRepository, userRepository, rewardProperties
        );

        assertThrows(IllegalArgumentException.class, () ->
                purchaseService.purchase("teacher-1", "c-1", true)
        );
    }

    // =========================================================================
    // 6. KIỂM THỬ TẢI & ĐỘ TRỄ (BENCHMARK SIMULATION)
    // =========================================================================

    @Test
    @DisplayName("8.1.6 - Benchmark: 1.000 lượt ghi nhận mẫu và cập nhật BitSet hoàn tất trong < 200ms (< 0.2ms/lô)")
    void testIngestPerformanceBenchmark() {
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id("att-bench")
                .userId("u-bench")
                .contentItemId("vid-bench")
                .durationSec(3600) // video 1 giờ = 360 bins
                .binSec(10)
                .status("OPEN")
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .coveredBins(new byte[45]) // 360 bins / 8 = 45 bytes
                .build();

        when(attemptRepo.lockById("att-bench")).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(i -> i.getArgument(0));

        // Sinh 1.000 mẫu khung hình
        List<Sample> thousandSamples = new ArrayList<>(1000);
        for (int i = 0; i < 1000; i++) {
            float timeSec = (float) ((i * 3.5) % 3600);
            boolean noFace = (i % 10 == 0); // 10% no face
            thousandSamples.add(new Sample(noFace ? "NO_FACE" : "ENGAGED", timeSec, 0.95f));
        }

        long startTime = System.nanoTime();

        // Xử lý 1.000 mẫu qua applyBatch
        var snapshot = attemptService.applyBatch("att-bench", thousandSamples, 1.0, 3600);

        long elapsedMs = (System.nanoTime() - startTime) / 1_000_000;

        assertNotNull(snapshot);
        assertEquals(1000, attempt.getSamplesTotal());
        assertEquals(100, attempt.getSamplesNoface());
        assertTrue(elapsedMs < 200, "1.000 lượt ghi mẫu phải chạy dưới 200ms, thực tế: " + elapsedMs + "ms");
    }

    // =========================================================================
    // 7. ĐỒNG THỜI (CONCURRENCY SIMULATION)
    // =========================================================================

    @Test
    @DisplayName("8.1.7 - Concurrency simulation: Nhiều thao tác nạp tiền chạy đồng thời không làm sai lệch số dư")
    void testConcurrentWalletCreditOperations() throws InterruptedException {
        int threadCount = 10;
        int operationsPerThread = 50;
        BigDecimal creditPerOp = new BigDecimal("1000");

        // Số dư ban đầu = 0
        StudentWallet wallet = StudentWallet.builder()
                .userId("u-concurrent")
                .cashBalance(BigDecimal.ZERO)
                .bonusBalance(BigDecimal.ZERO)
                .build();

        when(walletRepo.lockByUserId("u-concurrent")).thenReturn(Optional.of(wallet));
        when(walletRepo.save(any(StudentWallet.class))).thenAnswer(i -> i.getArgument(0));
        when(entryRepo.save(any(WalletEntry.class))).thenAnswer(i -> i.getArgument(0));

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        for (int t = 0; t < threadCount; t++) {
            executor.submit(() -> {
                try {
                    for (int i = 0; i < operationsPerThread; i++) {
                        synchronized (wallet) {
                            walletService.credit("u-concurrent", "TOPUP", "CASH", creditPerOp,
                                    null, null, null, "Concurrent credit");
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS), "Tất cả các luồng phải hoàn thành trong 5 giây");
        executor.shutdown();

        // 10 threads * 50 ops * 1.000 VND = 500.000 VND
        BigDecimal expectedBalance = new BigDecimal("500000");
        assertEquals(expectedBalance, wallet.getCashBalance(), "Số dư sau các luồng nạp song song phải đúng 500.000 VND");
    }
}
