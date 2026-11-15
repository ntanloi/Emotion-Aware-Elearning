package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;
import java.util.List;

public record TestAttemptResultDto(
        String testAttemptId,
        String testId,
        String title,
        String mode,
        String status,
        Integer scoreTotal,
        Integer scoreListening,
        Integer scoreReading,
        Integer rawListeningCorrect,
        Integer rawReadingCorrect,
        Integer totalQuestions,
        Integer totalCorrect,
        Integer timeSpentSeconds,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        List<TestPartResultDto> partResults,
        List<TestQuestionDetailDto> questionDetails
) {}
