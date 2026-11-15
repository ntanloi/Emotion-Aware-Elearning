package com.elearning.emotion.dto.report;

import java.util.List;

public record VocabSetProgressDto(
        String setId,
        String title,
        String courseId,
        String courseTitle,
        int totalWords,
        int masteredWords,
        int learningWords,
        int dueWords,
        double progressPercent,
        List<String> sampleWords
) {}
