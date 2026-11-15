package com.elearning.emotion.dto.report;

public record PartAccuracyDto(
        String sectionCode,
        String sectionName,
        long totalQuestions,
        long correctCount,
        double accuracyRate
) {}
