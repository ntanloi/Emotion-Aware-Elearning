package com.elearning.emotion.dto.report;

import java.util.List;

public record StudentVocabReportDto(
        VocabKpiDto kpi,
        SpacedRepetitionForecastDto forecast,
        List<VocabSetProgressDto> sets,
        List<DueWordItemDto> dueWords
) {}
