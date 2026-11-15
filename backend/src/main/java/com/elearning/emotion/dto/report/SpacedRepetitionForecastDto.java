package com.elearning.emotion.dto.report;

public record SpacedRepetitionForecastDto(
        int dueToday,
        int dueTomorrow,
        int dueIn3Days,
        int dueIn7Days,
        int dueLater
) {}
