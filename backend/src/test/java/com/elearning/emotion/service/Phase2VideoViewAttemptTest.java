package com.elearning.emotion.service;

import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.entity.VideoViewAttempt;
import com.elearning.emotion.event.VideoAttemptValidatedEvent;
import com.elearning.emotion.repository.VideoViewAttemptRepository;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.BitSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Phase2VideoViewAttemptTest {

    @Mock
    private VideoViewAttemptRepository attemptRepo;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private RewardProperties rewardProps;
    private VideoViewAttemptService attemptService;
    private FaceLostTracker faceLostTracker;

    @BeforeEach
    void setUp() {
        rewardProps = new RewardProperties();
        attemptService = new VideoViewAttemptService(attemptRepo, rewardProps, eventPublisher);
        faceLostTracker = new FaceLostTracker(rewardProps);
    }

    @Test
    @DisplayName("FaceLostTracker: Đúng 5 lô toàn NO_FACE chuyển FACE_LOST, chỉ thoát khi 2 lô liên tiếp có mặt")
    void testFaceLostTrackerThresholds() {
        String sessionId = "session-test-1";

        // 4 lô NO_FACE liên tiếp -> chưa lost
        for (int i = 0; i < 4; i++) {
            assertFalse(faceLostTracker.update(sessionId, false, true));
        }

        // Lô thứ 5 NO_FACE -> chuyển sang FACE_LOST
        assertTrue(faceLostTracker.update(sessionId, false, true));

        // Tiếp tục NO_FACE -> vẫn FACE_LOST
        assertTrue(faceLostTracker.update(sessionId, false, true));

        // 1 lô có mặt -> vẫn FACE_LOST (chống nhấp nháy do nhận diện hụt 1 lần)
        assertTrue(faceLostTracker.update(sessionId, true, false));

        // Lô thứ 2 liên tiếp có mặt -> thoát FACE_LOST thành công
        assertFalse(faceLostTracker.update(sessionId, true, false));
    }

    @Test
    @DisplayName("Độ phủ: Video 600s, ô 10s có 60 ô, phủ 54 ô (90%) và tỷ lệ xấu <= 30% -> VALID")
    void testAttemptFinalizesValidWhenCoverage90PercentAndBadUnder30() {
        String attemptId = "attempt-1";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[80])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Gửi 3000 mẫu, trong đó có 54 ô khác nhau được phủ (0s, 10s, 20s, ..., 530s)
        List<Sample> samples = new ArrayList<>();
        for (int i = 0; i < 54; i++) {
            samples.add(new Sample("ENGAGED", (float) (i * 10), 0.9f));
        }
        // Thêm 2146 mẫu ENGAGED khác (tổng 2200 mẫu ENGAGED)
        for (int i = 0; i < 2146; i++) {
            samples.add(new Sample("ENGAGED", 50.0f, 0.9f));
        }
        // Thêm 800 mẫu NO_FACE (tổng 3000 mẫu, 800 NO_FACE = 26.67% <= 30%)
        for (int i = 0; i < 800; i++) {
            samples.add(new Sample("NO_FACE", 50.0f, 0.9f));
        }

        var snapshot = attemptService.applyBatch(attemptId, samples, 1.0, 600);

        assertNotNull(snapshot);
        assertEquals("VALID", snapshot.status());
        assertEquals("VALID", attempt.getStatus());
        assertTrue(snapshot.coveragePercent() >= 90.0);
        assertTrue(snapshot.badPercent() <= 30.0);

        // Kiểm tra sự kiện VideoAttemptValidatedEvent được bắn ra
        ArgumentCaptor<VideoAttemptValidatedEvent> eventCaptor = ArgumentCaptor.forClass(VideoAttemptValidatedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        assertEquals("user-1", eventCaptor.getValue().userId());
        assertEquals("item-1", eventCaptor.getValue().contentItemId());
    }

    @Test
    @DisplayName("Độ phủ: Đạt 90% nhưng tỷ lệ xấu 31.7% (> 30%) -> INVALID")
    void testAttemptFinalizesInvalidWhenBadExceeds30Percent() {
        String attemptId = "attempt-2";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[80])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Sample> samples = new ArrayList<>();
        // 54 ô phủ
        for (int i = 0; i < 54; i++) {
            samples.add(new Sample("ENGAGED", (float) (i * 10), 0.9f));
        }
        // Thêm mẫu để tổng = 3000, 950 NO_FACE (31.67% > 30%)
        for (int i = 0; i < 1996; i++) {
            samples.add(new Sample("ENGAGED", 10.0f, 0.9f));
        }
        for (int i = 0; i < 950; i++) {
            samples.add(new Sample("NO_FACE", 10.0f, 0.9f));
        }

        var snapshot = attemptService.applyBatch(attemptId, samples, 1.0, 600);

        assertNotNull(snapshot);
        assertEquals("INVALID", snapshot.status());
        assertEquals("INVALID", attempt.getStatus());
        assertTrue(snapshot.badPercent() > 30.0);
        // Không bắn sự kiện khi INVALID
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Tốc độ phát 2.0x (> 1.5x) không được đánh dấu độ phủ ô")
    void testPlaybackRateExceedingLimitDoesNotMarkCoverage() {
        String attemptId = "attempt-3";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[80])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Gửi khung với tốc độ phát 2.0x
        List<Sample> samples = List.of(
                new Sample("ENGAGED", 20.0f, 0.9f),
                new Sample("ENGAGED", 30.0f, 0.9f)
        );

        var snapshot = attemptService.applyBatch(attemptId, samples, 2.0, 600);

        assertNotNull(snapshot);
        assertEquals(0.0, snapshot.coveragePercent());
        BitSet bits = BitSet.valueOf(attempt.getCoveredBins());
        assertEquals(0, bits.cardinality());
    }

    @Test
    @DisplayName("Tua lại xem cùng một đoạn ô thời gian không làm tăng độ phủ trùng lặp")
    void testReplayingSameSegmentDoesNotIncreaseCoverage() {
        String attemptId = "attempt-4";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(600)
                .binSec(10)
                .coveredBins(new byte[80])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Xem 100 lần ở cùng mốc 15 giây (ô 1)
        List<Sample> samples = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            samples.add(new Sample("ENGAGED", 15.0f, 0.9f));
        }

        var snapshot = attemptService.applyBatch(attemptId, samples, 1.0, 600);

        assertNotNull(snapshot);
        BitSet bits = BitSet.valueOf(attempt.getCoveredBins());
        assertEquals(1, bits.cardinality());
        assertEquals(100.0 * 1 / 60.0, snapshot.coveragePercent(), 0.01);
    }

    @Test
    @DisplayName("BORED D4: Video 30 phút (1800s), giới hạn 180s (900 khung). 900 khung chưa phạt, khung 901 phạt cả 901 khung")
    void testBoredRunThresholdOn30MinVideo() {
        String attemptId = "attempt-bored-1";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(1800) // 30 phút -> limit = 180s = 900 khung
                .binSec(10)
                .coveredBins(new byte[250])
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Gửi đúng 900 khung BORED (tin cậy 0.8 >= 0.7)
        List<Sample> samples900 = new ArrayList<>();
        for (int i = 0; i < 900; i++) {
            samples900.add(new Sample("BORED", 10.0f, 0.8f));
        }
        attemptService.applyBatch(attemptId, samples900, 1.0, 1800);

        assertFalse(attempt.isBoredRunFlagged());
        assertEquals(0, attempt.getBoredIdleFrames());

        // Gửi thêm 1 khung BORED nữa (khung thứ 901)
        List<Sample> sample1 = List.of(new Sample("BORED", 10.0f, 0.8f));
        attemptService.applyBatch(attemptId, sample1, 1.0, 1800);

        assertTrue(attempt.isBoredRunFlagged());
        assertEquals(901, attempt.getBoredIdleFrames());
    }

    @Test
    @DisplayName("BORED D4: Cảm xúc khác xen vào vượt dung sai 2s (10 khung) thì cắt chuỗi BORED, không tính treo máy")
    void testBoredInterleavedWithOtherEmotionsDoesNotTriggerIdle() {
        String attemptId = "attempt-bored-2";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(1800)
                .binSec(10)
                .coveredBins(new byte[250])
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Lặp lại 5 lần: 400 khung BORED, rồi 20 khung ENGAGED (4s > 2s tolerance)
        for (int cycle = 0; cycle < 5; cycle++) {
            List<Sample> batch = new ArrayList<>();
            for (int i = 0; i < 400; i++) {
                batch.add(new Sample("BORED", 10.0f, 0.85f));
            }
            for (int i = 0; i < 20; i++) {
                batch.add(new Sample("ENGAGED", 10.0f, 0.85f));
            }
            attemptService.applyBatch(attemptId, batch, 1.0, 1800);
        }

        assertEquals(0, attempt.getBoredIdleFrames());
        assertFalse(attempt.isBoredRunFlagged());
    }

    @Test
    @DisplayName("BORED D4: CONFUSED liên tục không bao giờ bị tính xấu; BORED tin cậy thấp (<0.7) coi như cảm xúc khác")
    void testConfusedNeverBadAndLowConfidenceBoredIgnored() {
        String attemptId = "attempt-confused";
        VideoViewAttempt attempt = VideoViewAttempt.builder()
                .id(attemptId)
                .userId("user-1")
                .contentItemId("item-1")
                .status("OPEN")
                .durationSec(1800)
                .binSec(10)
                .coveredBins(new byte[250])
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(attemptRepo.lockById(attemptId)).thenReturn(Optional.of(attempt));
        when(attemptRepo.save(any(VideoViewAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 3000 khung CONFUSED (10 phút)
        List<Sample> samples = new ArrayList<>();
        for (int i = 0; i < 3000; i++) {
            samples.add(new Sample("CONFUSED", 10.0f, 0.95f));
        }
        // Thêm 500 khung BORED với độ tin cậy thấp (0.5 < 0.7)
        for (int i = 0; i < 500; i++) {
            samples.add(new Sample("BORED", 10.0f, 0.5f));
        }

        var snap = attemptService.applyBatch(attemptId, samples, 1.0, 1800);

        assertNotNull(snap);
        assertEquals(0, attempt.getBoredIdleFrames());
        assertEquals(0, attempt.getSamplesNoface());
        assertEquals(0.0, snap.badPercent());
    }
}
