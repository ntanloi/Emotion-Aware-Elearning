package com.elearning.emotion.dto.report;

public record VocabKpiDto(
        int totalWords,
        int masteredWords,
        int learningWords,
        int newWords,
        int dueForReviewCount,
        Double retentionRate
) {}
