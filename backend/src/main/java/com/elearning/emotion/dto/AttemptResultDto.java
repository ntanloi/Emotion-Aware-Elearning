package com.elearning.emotion.dto;

import java.util.List;

public record AttemptResultDto(
        String attemptId, Float score, Integer totalQuestions, Integer correctCount,
        List<AttemptAnswerResultDto> details
) {}
