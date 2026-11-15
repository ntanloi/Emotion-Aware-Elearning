package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;
import java.util.List;

public record TestAttemptStartResponse(
        String testAttemptId,
        String testId,
        String title,
        String mode,
        List<Integer> selectedParts,
        String feedbackMode,
        Integer timeLimitSeconds,
        LocalDateTime startedAt,
        LocalDateTime deadlineAt
) {}
