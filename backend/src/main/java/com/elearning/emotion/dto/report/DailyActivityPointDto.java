package com.elearning.emotion.dto.report;

public record DailyActivityPointDto(
        String date,                // YYYY-MM-DD (giờ VN)
        long studySeconds,
        Double focusScore,          // null nếu không có video hoặc thiếu mẫu
        int videoSessionsCount,
        int practiceAttemptsCount
) {}
