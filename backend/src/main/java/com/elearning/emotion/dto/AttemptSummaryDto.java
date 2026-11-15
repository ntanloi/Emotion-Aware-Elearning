package com.elearning.emotion.dto;

import java.time.LocalDateTime;

public record AttemptSummaryDto(
        String id,
        String contentItemId,
        String contentItemTitle,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        Float score,
        Integer totalQuestions,
        Integer correctCount
) {}
