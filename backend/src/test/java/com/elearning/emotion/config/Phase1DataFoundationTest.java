package com.elearning.emotion.config;

import com.elearning.emotion.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class Phase1DataFoundationTest {

    @Test
    @DisplayName("RewardProperties có đầy đủ cấu hình mặc định theo đặc tả Phase 1 và D1-D8")
    void testRewardPropertiesDefaults() {
        RewardProperties props = new RewardProperties();
        assertTrue(props.isTrackingEnabled());
        assertFalse(props.isEnabled());
        assertEquals(BigDecimal.TEN, props.getEscrowPercent());
        assertEquals(BigDecimal.valueOf(70), props.getRequiredVideoPercent());
        assertEquals(30.0, props.getMaxBadPercent());
        assertEquals(90, props.getMinCoveragePercent());
        assertEquals(10, props.getBinSeconds());
        assertEquals(1.5, props.getMaxPlaybackRate());
        assertEquals(180, props.getHoldingDays());
        assertEquals(24, props.getAttemptWindowHours());
        assertEquals(5, props.getFaceLostPauseBatches());
        assertEquals(10, props.getFaceLostMaxMinutes());
        assertEquals("v1", props.getPolicyVersion());
        assertEquals(5, props.getFramesPerSecond());
        assertEquals(6, props.getMinAccessMonths());
        assertEquals(365, props.getStartDeadlineDays());

        assertNotNull(props.getBoredIdle());
        assertFalse(props.getBoredIdle().isCountsAsBad());
        assertEquals(0.7, props.getBoredIdle().getMinConfidence());
        assertEquals(60, props.getBoredIdle().getRunMinSeconds());
        assertEquals(300, props.getBoredIdle().getRunMaxSeconds());
        assertEquals(10, props.getBoredIdle().getRunVideoPercent());
        assertEquals(2, props.getBoredIdle().getGapToleranceSeconds());
    }

    @Test
    @DisplayName("WalletProperties có đầy đủ cấu hình theo Phase 1 và D3, D7")
    void testWalletPropertiesDefaults() {
        WalletProperties props = new WalletProperties();
        assertTrue(props.isLegacyQrEnabled());
        assertTrue(props.isWithdrawBonusAllowed());
        assertEquals(BigDecimal.valueOf(50000), props.getMinWithdraw());
        assertEquals(1, props.getCashWithdrawHoldMonths());
    }

    @Test
    @DisplayName("StudentWallet entity khởi tạo và lưu trữ đúng cấu trúc")
    void testStudentWalletEntity() {
        StudentWallet wallet = StudentWallet.builder()
                .userId("user-uuid-1")
                .topupCode("NAPABC12345")
                .build();

        assertEquals("user-uuid-1", wallet.getUserId());
        assertEquals(BigDecimal.ZERO, wallet.getCashBalance());
        assertEquals(BigDecimal.ZERO, wallet.getBonusBalance());
        assertEquals("NAPABC12345", wallet.getTopupCode());
    }

    @Test
    @DisplayName("WalletEntry entity hỗ trợ đầy đủ các bucket và id tham chiếu")
    void testWalletEntryEntity() {
        WalletEntry entry = WalletEntry.builder()
                .userId("user-1")
                .type("TOPUP")
                .bucket("CASH")
                .amount(BigDecimal.valueOf(500000))
                .cashAfter(BigDecimal.valueOf(500000))
                .bonusAfter(BigDecimal.ZERO)
                .paymentTransactionId("tx-1")
                .orderId("order-1")
                .escrowId("escrow-1")
                .withdrawalId("withdraw-1")
                .description("Nạp ví kiểm thử")
                .build();

        assertEquals("TOPUP", entry.getType());
        assertEquals("CASH", entry.getBucket());
        assertEquals(BigDecimal.valueOf(500000), entry.getAmount());
        assertEquals("withdraw-1", entry.getWithdrawalId());
    }

    @Test
    @DisplayName("WalletWithdrawal entity hỗ trợ rút tiền từ CASH và BONUS")
    void testWalletWithdrawalEntity() {
        WalletWithdrawal withdrawal = WalletWithdrawal.builder()
                .userId("user-1")
                .amount(BigDecimal.valueOf(100000))
                .fromCash(BigDecimal.valueOf(60000))
                .fromBonus(BigDecimal.valueOf(40000))
                .bankId("MB")
                .bankAccountNo("0123456789")
                .bankAccountName("NGUYEN VAN A")
                .status("PENDING")
                .build();

        assertEquals("PENDING", withdrawal.getStatus());
        assertEquals(BigDecimal.valueOf(60000), withdrawal.getFromCash());
        assertEquals(BigDecimal.valueOf(40000), withdrawal.getFromBonus());
    }

    @Test
    @DisplayName("RewardEscrow và RewardEscrowVideo snapshot hoạt động chính xác")
    void testRewardEscrowEntities() {
        LocalDateTime until = LocalDateTime.now().plusMonths(6);
        RewardEscrow escrow = RewardEscrow.builder()
                .orderId("order-1")
                .userId("user-1")
                .courseId("course-1")
                .teacherId("teacher-1")
                .amount(BigDecimal.valueOf(50000))
                .status("HOLDING")
                .requiredPercent(BigDecimal.valueOf(70))
                .policyVersion("v1")
                .holdingUntil(until)
                .build();

        assertEquals("HOLDING", escrow.getStatus());
        assertEquals(BigDecimal.valueOf(50000), escrow.getAmount());

        RewardEscrowVideo rev = RewardEscrowVideo.builder()
                .escrowId("escrow-1")
                .contentItemId("item-video-1")
                .build();
        assertEquals("escrow-1", rev.getEscrowId());
        assertEquals("item-video-1", rev.getContentItemId());

        RewardEscrowVideoId revId1 = new RewardEscrowVideoId("e1", "v1");
        RewardEscrowVideoId revId2 = new RewardEscrowVideoId("e1", "v1");
        assertEquals(revId1, revId2);
        assertEquals(revId1.hashCode(), revId2.hashCode());
    }

    @Test
    @DisplayName("VideoViewAttempt entity hỗ trợ BitSet coveredBins và các trường BORED")
    void testVideoViewAttemptEntity() {
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[10])
                .samplesTotal(100)
                .samplesNoface(10)
                .samplesBored(5)
                .boredRunFrames(20)
                .boredGapFrames(2)
                .boredIdleFrames(0)
                .boredRunFlagged(false)
                .lastActivityAt(LocalDateTime.now())
                .build();

        assertEquals("OPEN", attempt.getStatus());
        assertEquals(600, attempt.getDurationSec());
        assertEquals(10, attempt.getBinSec());
        assertEquals(10, attempt.getCoveredBins().length);
        assertEquals(20, attempt.getBoredRunFrames());
    }

    @Test
    @DisplayName("Order entity có đầy đủ các trường escrow 10%, phí và thời hạn khóa")
    void testOrderExtendedFields() {
        LocalDateTime now = LocalDateTime.now();
        Order order = Order.builder()
                .orderCode("WLT12345678")
                .amount(BigDecimal.valueOf(500000))
                .platformFee(BigDecimal.valueOf(25000))
                .rewardEscrowAmount(BigDecimal.valueOf(50000))
                .teacherAmount(BigDecimal.valueOf(425000))
                .feePercent(BigDecimal.valueOf(5))
                .escrowPercent(BigDecimal.valueOf(10))
                .policyVersion("v1")
                .rewardTermsAcceptedAt(now)
                .accessMonths(6)
                .build();

        assertEquals(BigDecimal.valueOf(50000), order.getRewardEscrowAmount());
        assertEquals(BigDecimal.valueOf(10), order.getEscrowPercent());
        assertEquals("v1", order.getPolicyVersion());
        assertEquals(6, order.getAccessMonths());
        assertEquals(now, order.getRewardTermsAcceptedAt());
    }

    @Test
    @DisplayName("PaymentTransaction entity có kind và topupUserId")
    void testPaymentTransactionExtendedFields() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .kind("TOPUP")
                .topupUserId("user-uuid-1")
                .transferAmount(BigDecimal.valueOf(200000))
                .build();

        assertEquals("TOPUP", tx.getKind());
        assertEquals("user-uuid-1", tx.getTopupUserId());
    }

    @Test
    @DisplayName("LearningSession entity có attemptId, faceLostSince, cameraChoice")
    void testLearningSessionExtendedFields() {
        LocalDateTime lost = LocalDateTime.now();
        LearningSession session = LearningSession.builder()
                .attemptId("attempt-uuid-1")
                .faceLostSince(lost)
                .cameraChoice("ON")
                .build();

        assertEquals("attempt-uuid-1", session.getAttemptId());
        assertEquals(lost, session.getFaceLostSince());
        assertEquals("ON", session.getCameraChoice());
    }

    @Test
    @DisplayName("Course và Enrollment entity có accessMonths, startedAt, expiresAt")
    void testCourseAndEnrollmentAccessMonths() {
        Course course = Course.builder()
                .title("TOEIC 750+")
                .accessMonths(12)
                .build();
        assertEquals(12, course.getAccessMonths());

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime expire = start.plusMonths(12);
        Enrollment enrollment = Enrollment.builder()
                .accessMonths(12)
                .startedAt(start)
                .expiresAt(expire)
                .build();

        assertEquals(12, enrollment.getAccessMonths());
        assertEquals(start, enrollment.getStartedAt());
        assertEquals(expire, enrollment.getExpiresAt());
    }
}
