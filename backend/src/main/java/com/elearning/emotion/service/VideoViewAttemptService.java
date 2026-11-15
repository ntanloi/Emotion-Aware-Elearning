package com.elearning.emotion.service;

import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.entity.VideoViewAttempt;
import com.elearning.emotion.event.VideoAttemptValidatedEvent;
import com.elearning.emotion.repository.VideoViewAttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.BitSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoViewAttemptService {

    private final VideoViewAttemptRepository repo;
    private final RewardProperties props;
    private final ApplicationEventPublisher events;

    public record Sample(String learningState, Float videoTimeSec, Float confidence) {
        public Sample(String learningState, Float videoTimeSec) {
            this(learningState, videoTimeSec, 1.0f);
        }
    }

    public record AttemptSnapshot(String id, String status, double coveragePercent, double badPercent) {}

    /**
     * Gọi khi học viên bắt đầu phiên học có bật camera.
     * Trả về lượt xem đang mở (trong cửa sổ 24 giờ) hoặc tạo lượt xem mới.
     */
    @Transactional
    public String openOrGet(String userId, String contentItemId) {
        LocalDateTime now = LocalDateTime.now();
        var open = repo.findOpen(userId, contentItemId, now.minusHours(props.getAttemptWindowHours()));
        if (!open.isEmpty()) {
            return open.get(0).getId();
        }
        VideoViewAttempt attempt = repo.save(VideoViewAttempt.builder()
                .userId(userId)
                .contentItemId(contentItemId)
                .status("OPEN")
                .durationSec(0)
                .binSec(props.getBinSeconds())
                .coveredBins(new byte[0])
                .samplesTotal(0)
                .samplesNoface(0)
                .samplesBored(0)
                .boredRunFrames(0)
                .boredGapFrames(0)
                .boredIdleFrames(0)
                .boredRunFlagged(false)
                .lastActivityAt(now)
                .build());
        return attempt.getId();
    }

    /**
     * Gọi sau mỗi lô khung hình nhận diện được gửi lên từ client.
     * Trả về null nếu lượt đã chốt (VALID/INVALID/EXPIRED) hoặc không tồn tại.
     */
    @Transactional
    public AttemptSnapshot applyBatch(String attemptId, List<Sample> samples,
                                      double playbackRate, Integer clientDurationSec) {
        VideoViewAttempt a = repo.lockById(attemptId).orElse(null);
        if (a == null || !"OPEN".equals(a.getStatus())) {
            return null;
        }

        // D5: Thời lượng video chỉ được chốt một lần (tối đa 8192 bin ~ gần 23 giờ)
        if (a.getDurationSec() == 0 && clientDurationSec != null && clientDurationSec >= 5) {
            a.setDurationSec(Math.min(clientDurationSec, a.getBinSec() * 8192));
        }

        BitSet bits = BitSet.valueOf(a.getCoveredBins());
        int totalBins = totalBins(a);
        boolean rateOk = playbackRate <= props.getMaxPlaybackRate();

        for (Sample s : samples) {
            a.setSamplesTotal(a.getSamplesTotal() + 1);
            boolean noFace = "NO_FACE".equalsIgnoreCase(s.learningState());
            if (noFace) {
                a.setSamplesNoface(a.getSamplesNoface() + 1);
            }
            if ("BORED".equalsIgnoreCase(s.learningState())) {
                a.setSamplesBored(a.getSamplesBored() + 1);
            }

            // Đánh dấu độ phủ nếu có mặt người và tốc độ không vượt 1.5x
            if (!noFace && rateOk && totalBins > 0 && s.videoTimeSec() != null) {
                int bin = (int) (s.videoTimeSec() / a.getBinSec());
                if (bin >= 0 && bin < totalBins) {
                    bits.set(bin);
                }
            }

            // Theo dõi chuỗi BORED liên tục (D4)
            trackBored(a, s.learningState(), s.confidence() == null ? 1.0f : s.confidence());
        }

        a.setCoveredBins(bits.toByteArray());
        a.setLastActivityAt(LocalDateTime.now());

        // Đạt độ phủ tối thiểu (mặc định 90%) -> chốt lượt xem
        if (totalBins > 0 && coveragePercent(bits, totalBins) >= props.getMinCoveragePercent()) {
            finalizeAttempt(a);
        }

        repo.save(a);
        return new AttemptSnapshot(a.getId(), a.getStatus(),
                coveragePercent(bits, totalBins), badPercent(a));
    }

    private void finalizeAttempt(VideoViewAttempt a) {
        boolean ok = badPercent(a) <= props.getMaxBadPercent();
        a.setStatus(ok ? "VALID" : "INVALID");
        a.setFinalizedAt(LocalDateTime.now());
        if (ok) {
            events.publishEvent(new VideoAttemptValidatedEvent(a.getUserId(), a.getContentItemId()));
        }
    }

    /**
     * Tính tỷ lệ xấu:
     * - NO_FACE luôn tính là xấu (rời camera).
     * - Khi countsAsBad bật (D4), các khung BORED liên tục vượt ngưỡng (bored_idle_frames) cũng được tính là xấu.
     */
    public double badPercent(VideoViewAttempt a) {
        if (a.getSamplesTotal() == 0) return 100.0;
        long bad = a.getSamplesNoface()
                + (props.getBoredIdle().isCountsAsBad() ? a.getBoredIdleFrames() : 0);
        return 100.0 * bad / a.getSamplesTotal();
    }

    /**
     * Logic theo dõi BORED kéo dài (D4):
     * - BORED liên tục vượt ngưỡng theo thời lượng video (10%, từ 60s đến 300s) coi là treo máy.
     * - Cảm xúc khác (ENGAGED, INTERESTED, CONFUSED) xen vào quá tolerance (2s) thì cắt đoạn và reset.
     * - NO_FACE cắt đoạn BORED (không đếm trùng vì đã tính ở NO_FACE).
     * - Khung BORED độ tin cậy < minConfidence (0.7) coi như cảm xúc khác.
     */
    private void trackBored(VideoViewAttempt a, String state, float conf) {
        var cfg = props.getBoredIdle();
        int fps = props.getFramesPerSecond();
        int tolerance = cfg.getGapToleranceSeconds() * fps;
        int limit = boredRunLimitSeconds(a) * fps;
        boolean noFace = "NO_FACE".equalsIgnoreCase(state);
        boolean bored = "BORED".equalsIgnoreCase(state) && conf >= cfg.getMinConfidence();

        if (bored) {
            a.setBoredGapFrames(0);
            a.setBoredRunFrames(a.getBoredRunFrames() + 1);
            if (a.isBoredRunFlagged()) {
                a.setBoredIdleFrames(a.getBoredIdleFrames() + 1);
            } else if (a.getBoredRunFrames() > limit) {
                a.setBoredRunFlagged(true);
                // Đã vượt giới hạn: phạt toàn bộ số khung của chuỗi kéo dài này
                a.setBoredIdleFrames(a.getBoredIdleFrames() + a.getBoredRunFrames());
            }
        } else if (noFace) {
            resetBoredRun(a);
        } else if (a.getBoredRunFrames() > 0) {
            a.setBoredGapFrames(a.getBoredGapFrames() + 1);
            if (a.getBoredGapFrames() > tolerance) {
                resetBoredRun(a); // cảm xúc tích cực/bối rối đủ lâu: không phải treo máy
            }
        }
    }

    private void resetBoredRun(VideoViewAttempt a) {
        a.setBoredRunFrames(0);
        a.setBoredGapFrames(0);
        a.setBoredRunFlagged(false);
    }

    private int boredRunLimitSeconds(VideoViewAttempt a) {
        var cfg = props.getBoredIdle();
        int byVideo = (int) Math.round(a.getDurationSec() * cfg.getRunVideoPercent() / 100.0);
        return Math.max(cfg.getRunMinSeconds(), Math.min(cfg.getRunMaxSeconds(), byVideo));
    }

    public int totalBins(VideoViewAttempt a) {
        return a.getDurationSec() <= 0 ? 0 : (int) Math.ceil(a.getDurationSec() / (double) a.getBinSec());
    }

    public double coveragePercent(BitSet bits, int totalBins) {
        return totalBins == 0 ? 0.0 : 100.0 * bits.cardinality() / totalBins;
    }

    public AttemptSnapshot getSnapshot(VideoViewAttempt a) {
        if (a == null) return null;
        BitSet bits = BitSet.valueOf(a.getCoveredBins());
        int totalBins = totalBins(a);
        return new AttemptSnapshot(a.getId(), a.getStatus(), coveragePercent(bits, totalBins), badPercent(a));
    }

    /** Lượt xem không có hoạt động quá attemptWindowHours (24 giờ) thì tự động hết hạn */
    @Scheduled(fixedDelay = 600_000)
    @Transactional
    public void expireStale() {
        LocalDateTime now = LocalDateTime.now();
        int n = repo.expireOpenBefore(now.minusHours(props.getAttemptWindowHours()), now);
        if (n > 0) {
            log.info("Đã hết hạn {} lượt xem video", n);
        }
    }
}
