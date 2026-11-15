package com.elearning.emotion.dto.report;

import java.util.List;

public record StudentReportOverviewDto(
        ReportKpiDto kpi,
        List<DailyActivityPointDto> dailyActivity,
        List<String> highlights
) {}
