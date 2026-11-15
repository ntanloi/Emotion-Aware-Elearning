package com.elearning.emotion.dto.report;

import com.elearning.emotion.entity.DailyReport;
import java.time.LocalDate;

public record DailyReportResponseDto(
        String id,
        LocalDate reportDate,
        String status,
        String emotionSummary,
        String aiAdviceText,
        String metrics
) {
    public static DailyReportResponseDto from(DailyReport r) {
        if (r == null) return null;
        return new DailyReportResponseDto(
                r.getId(),
                r.getReportDate(),
                r.getStatus(),
                r.getEmotionSummary(),
                r.getAiAdviceText(),
                r.getMetrics()
        );
    }
}
