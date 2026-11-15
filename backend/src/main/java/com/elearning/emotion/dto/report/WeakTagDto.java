package com.elearning.emotion.dto.report;

public record WeakTagDto(
        String tag,
        long totalQuestions,
        long correctCount,
        double accuracyRate,
        String status
) {}
