package com.elearning.emotion.dto.report;

public record AttemptHistoryItemDto(
        String attemptId,
        String contentItemId,
        String contentItemTitle,
        String courseId,
        String courseTitle,
        String sectionCode,
        Float score,
        Integer totalQuestions,
        Integer correctCount,
        Long durationSeconds,
        String submittedAt
) {}
