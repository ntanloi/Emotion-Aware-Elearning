package com.elearning.emotion.dto;

import java.time.LocalDateTime;

public record SessionSummaryDto(
        String sessionId,
        String contentItemId,
        String lessonTitle,
        String status,
        LocalDateTime startTime,
        LocalDateTime endTime,
        long durationSeconds,
        double engagementScore,
        double focusScore,
        long totalFrames,
        double engagedPercent,
        double interestedPercent,
        double confusedPercent,
        double boredPercent,
        double noFacePercent,
        long suggestionsCount,
        String aiAdvice
) {}
