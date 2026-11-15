package com.elearning.emotion.service.report;

import com.elearning.emotion.dto.report.DeleteEmotionDataResultDto;
import com.elearning.emotion.dto.report.EmotionPrivacyOverviewDto;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmotionPrivacyService {

    private final EmotionLogRepository emotionLogRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final DailyReportRepository dailyReportRepository;

    /**
     * Lấy tổng quan tình trạng dữ liệu cảm xúc và quyền riêng tư của học viên
     */
    @Transactional(readOnly = true)
    public EmotionPrivacyOverviewDto getPrivacyOverview(String userId) {
        long logsCount = emotionLogRepository.countByUserId(userId);
        long bucketsCount = sessionBucketStatsRepository.countByUserId(userId);
        long cameraSessions = learningSessionRepository.countByUserIdAndHasCameraPermissionTrue(userId);
        long totalSessions = learningSessionRepository.countByUserId(userId);
        long dailyReports = dailyReportRepository.countByUserId(userId);

        String notice = "Hệ thống tuân thủ nguyên tắc Quyền riêng tư ngay từ khâu thiết kế (Privacy-by-Design): " +
                "Chỉ lưu trữ nhãn cảm xúc và điểm tập trung dạng số học nhằm mục đích tối ưu hóa sư phạm. " +
                "Video và hình ảnh trực tiếp từ camera hoàn toàn được xử lý cục bộ trên trình duyệt/mô hình nhận diện " +
                "và KHÔNG BAO GIỜ được ghi hình hay lưu trữ trên máy chủ. Bạn có quyền yêu cầu xóa sạch toàn bộ " +
                "dữ liệu này bất kỳ lúc nào.";

        return new EmotionPrivacyOverviewDto(
                logsCount,
                bucketsCount,
                cameraSessions,
                totalSessions,
                dailyReports,
                30,
                notice
        );
    }

    /**
     * Xóa toàn bộ dữ liệu cảm xúc cá nhân của học viên (Right to be Forgotten)
     */
    @Transactional
    public DeleteEmotionDataResultDto deleteUserEmotionData(String userId) {
        log.warn("Bắt đầu xóa toàn bộ dữ liệu cảm xúc của học viên: {}", userId);

        int deletedLogs = emotionLogRepository.deleteByUserId(userId);
        int deletedSuggestions = adaptiveSuggestionRepository.deleteByUserId(userId);
        int deletedBuckets = sessionBucketStatsRepository.deleteByUserId(userId);
        int resetSessions = learningSessionRepository.resetFocusScoresByUserId(userId);
        int deletedReports = dailyReportRepository.deleteByUserId(userId);

        log.info("Hoàn tất xóa dữ liệu cảm xúc cho học viên {}: {} logs, {} buckets, {} suggestions, {} sessions reset, {} reports",
                userId, deletedLogs, deletedBuckets, deletedSuggestions, resetSessions, deletedReports);

        return new DeleteEmotionDataResultDto(
                deletedLogs,
                deletedBuckets,
                deletedSuggestions,
                resetSessions,
                deletedReports,
                "Đã xóa vĩnh viễn toàn bộ dữ liệu cảm xúc của bạn khỏi hệ thống thành công."
        );
    }
}
