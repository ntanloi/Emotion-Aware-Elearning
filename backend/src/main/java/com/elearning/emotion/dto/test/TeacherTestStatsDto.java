package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;
import java.util.List;

public record TeacherTestStatsDto(
        long totalTests,
        long publishedTests,
        long pendingTests,
        long totalAttempts,
        Double overallAverageScore,
        List<TeacherTestSummaryItemDto> testSummaries
) {
    public record TeacherTestSummaryItemDto(
            String testId,
            String title,
            String status,
            Integer version,
            long attemptCount,
            Double averageScore,
            Double averageListeningScore,
            Double averageReadingScore,
            LocalDateTime publishedAt
    ) {}
}
