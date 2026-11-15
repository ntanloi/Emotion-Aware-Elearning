package com.elearning.emotion.dto.report;

/**
 * Kết quả sau khi học viên thực hiện quyền xóa dữ liệu cảm xúc (Phase R5)
 */
public record DeleteEmotionDataResultDto(
        long deletedEmotionLogs,
        long deletedBucketStats,
        long deletedSuggestions,
        long resetSessions,
        long deletedDailyReports,
        String message
) {}
