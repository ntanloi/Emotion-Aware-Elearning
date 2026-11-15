package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;

public record TestAttemptSummaryDto(
        String id,
        String testId,
        String testTitle,
        String mode,
        String status,
        Integer scoreTotal,
        Integer scoreListening,
        Integer scoreReading,
        Integer totalQuestions,
        Integer totalCorrect,
        LocalDateTime startedAt,
        LocalDateTime submittedAt
) {}
