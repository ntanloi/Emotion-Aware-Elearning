package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record TestContentDto(
        String testAttemptId,
        String testId,
        String title,
        String description,
        String mode,
        String feedbackMode,
        Integer timeLimitSeconds,
        LocalDateTime startedAt,
        LocalDateTime deadlineAt,
        String status,
        List<TestPartContentDto> parts,
        Map<String, String> draftAnswers
) {}
