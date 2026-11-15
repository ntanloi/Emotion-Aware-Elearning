package com.elearning.emotion.dto.test;

public record TestPartResultDto(
        Integer partNo,
        Integer totalQuestions,
        Integer correctCount,
        Double accuracyRate
) {}
