package com.elearning.emotion.dto.report;

public record StudentLessonEmotionSummaryDto(
        String contentItemId,
        String lessonTitle,
        String courseId,
        String courseTitle,
        String sectionCode,
        long totalActiveSeconds,
        int totalSessionsCount,
        Double focusScore,
        Double presenceRate,
        Double engagedPercent,
        Double interestedPercent,
        Double confusedPercent,
        Double boredPercent,
        int suggestionsCount,
        int acceptedSuggestionsCount,
        boolean hasReviewSegments,
        String lastStudiedAt
) {}
