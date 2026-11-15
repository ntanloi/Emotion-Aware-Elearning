package com.elearning.emotion.dto.report;

import java.util.List;

public record StudentPracticeReportDto(
        List<PartAccuracyDto> partAccuracies,
        List<WeakTagDto> weakTags,
        List<AttemptHistoryItemDto> scoreTrend,
        List<AttemptHistoryItemDto> recentAttempts,
        List<WrongQuestionItemDto> wrongQuestions,
        int totalPracticeTests,
        int totalQuestionsAnswered,
        int totalWrongQuestionsCount,
        Double overallAccuracyRate
) {}
