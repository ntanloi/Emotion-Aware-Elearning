package com.elearning.emotion.service.report;

import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.SessionBucketStatsRepository.SessionTotalsProjection;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.ChronoUnit;

/**
 * ReportCalculationService — Dịch vụ tính toán số liệu báo cáo chuẩn hóa (Phase R0 KLTN).
 * Thống nhất một công thức duy nhất cho toàn hệ thống:
 * - Điểm tập trung = (ENGAGED + INTERESTED) / Mẫu hợp lệ (Mẫu hợp lệ loại NO_FACE và confidence < 0.5).
 * - Tỷ lệ có mặt = 1 - Tỷ lệ NO_FACE.
 * - Quy đổi ranh giới ngày theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 */
@Service
public class ReportCalculationService {

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final int MIN_VALID_SAMPLES = 30; // Buổi học < 30 mẫu hợp lệ sẽ không đưa vào trung bình

    public record EmotionMetrics(
            double focusScore,         // (engaged + interested) / validSamples * 100
            double presenceRate,       // (total - noFace) / total * 100
            double engagedPercent,
            double interestedPercent,
            double neutralPercent,
            double confusedPercent,
            double boredPercent,
            double noFacePercent,
            long totalSamples,
            long validSamples,
            boolean hasSufficientData  // true nếu validSamples >= 30
    ) {}

    /**
     * Tính toán bộ chỉ số cảm xúc chuẩn hóa từ tổng hợp mẫu.
     */
    public EmotionMetrics calculateMetrics(
            long total,
            long engaged,
            long interested,
            long neutral,
            long confused,
            long bored,
            long noFace
    ) {
        long valid = total - noFace;
        boolean sufficient = valid >= MIN_VALID_SAMPLES;

        double focusScore = valid > 0
                ? Math.round(((double) (engaged + interested) / valid) * 1000.0) / 10.0
                : 0.0;

        double presenceRate = total > 0
                ? Math.round(((double) (total - noFace) / total) * 1000.0) / 10.0
                : 0.0;

        double engagedPct = valid > 0 ? Math.round(((double) engaged / valid) * 1000.0) / 10.0 : 0.0;
        double interestedPct = valid > 0 ? Math.round(((double) interested / valid) * 1000.0) / 10.0 : 0.0;
        double neutralPct = valid > 0 ? Math.round(((double) neutral / valid) * 1000.0) / 10.0 : 0.0;
        double confusedPct = valid > 0 ? Math.round(((double) confused / valid) * 1000.0) / 10.0 : 0.0;
        double boredPct = valid > 0 ? Math.round(((double) bored / valid) * 1000.0) / 10.0 : 0.0;
        double noFacePct = total > 0 ? Math.round(((double) noFace / total) * 1000.0) / 10.0 : 0.0;

        return new EmotionMetrics(
                focusScore,
                presenceRate,
                engagedPct,
                interestedPct,
                neutralPct,
                confusedPct,
                boredPct,
                noFacePct,
                total,
                valid,
                sufficient
        );
    }

    public EmotionMetrics calculateMetrics(SessionTotalsProjection p) {
        if (p == null) {
            return new EmotionMetrics(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, false);
        }
        return calculateMetrics(
                p.getTotal() != null ? p.getTotal() : 0,
                p.getEngaged() != null ? p.getEngaged() : 0,
                p.getInterested() != null ? p.getInterested() : 0,
                p.getNeutral() != null ? p.getNeutral() : 0,
                p.getConfused() != null ? p.getConfused() : 0,
                p.getBored() != null ? p.getBored() : 0,
                p.getNoFace() != null ? p.getNoFace() : 0
        );
    }

    /**
     * Tính thời lượng học thực tế (giây).
     * Ưu tiên active_seconds. Nếu bằng 0 (phiên cũ), tính theo khoảng thời gian giữa start_time và end_time.
     */
    public int getEffectiveStudySeconds(LearningSession session) {
        if (session == null) return 0;
        if (session.getActiveSeconds() != null && session.getActiveSeconds() > 0) {
            return session.getActiveSeconds();
        }
        if (session.getStartTime() != null) {
            LocalDateTime end = session.getEndTime() != null ? session.getEndTime() : session.getStartTime();
            return (int) Math.max(0, ChronoUnit.SECONDS.between(session.getStartTime(), end));
        }
        return 0;
    }

    /**
     * Quy đổi thời điểm sang ngày (LocalDateTime được lưu trực tiếp theo giờ hệ thống).
     */
    public LocalDate toVnLocalDate(LocalDateTime dateTime) {
        if (dateTime == null) return LocalDate.now(VN_ZONE);
        return dateTime.toLocalDate();
    }

    /**
     * Lấy thời điểm bắt đầu ngày (00:00:00) của ngày chỉ định để truy vấn DB.
     */
    public LocalDateTime getStartOfDayUtc(LocalDate date) {
        if (date == null) return LocalDate.now(VN_ZONE).atStartOfDay();
        return date.atStartOfDay();
    }

    /**
     * Lấy thời điểm kết thúc ngày (23:59:59.999999999) của ngày chỉ định để truy vấn DB.
     */
    public LocalDateTime getEndOfDayUtc(LocalDate date) {
        if (date == null) return LocalDate.now(VN_ZONE).atTime(LocalTime.MAX);
        return date.atTime(LocalTime.MAX);
    }
}
