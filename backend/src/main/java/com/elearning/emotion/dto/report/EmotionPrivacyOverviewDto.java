package com.elearning.emotion.dto.report;

/**
 * DTO tổng quan dữ liệu cảm xúc & quyền riêng tư của học viên (Phase R5)
 */
public record EmotionPrivacyOverviewDto(
        long totalEmotionLogsCount,
        long totalBucketStatsCount,
        long cameraSessionsCount,
        long totalSessionsCount,
        long dailyReportsCount,
        int retentionDays,
        String privacyNotice
) {}
