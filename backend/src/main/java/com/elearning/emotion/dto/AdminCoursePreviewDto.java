package com.elearning.emotion.dto;

import java.util.List;

public record AdminCoursePreviewDto(
        AdminCourseDto course,
        List<SectionPreviewDto> sections,
        int totalSections,
        int totalItems,
        int totalQuestions
) {
    public record SectionPreviewDto(
            String sectionCode,
            String title,
            List<GroupPreviewDto> groups,
            List<ItemSummaryDto> ungroupedItems
    ) {}

    public record GroupPreviewDto(
            String id,
            String title,
            Integer orderIndex,
            List<ItemSummaryDto> items
    ) {}

    public record ItemSummaryDto(
            String id,
            String title,
            String type,
            Integer orderIndex,
            boolean hasVideo,
            boolean hasBodyHtml,
            long questionCount
    ) {}
}
