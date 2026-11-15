package com.elearning.emotion.dto.report;

public record ReportKpiDto(
        long totalStudySeconds,
        int totalSessions,
        Double avgFocusScore,
        Double avgPracticeScore,
        Double courseProgressPercent,
        int learningStreakDays
) {}
