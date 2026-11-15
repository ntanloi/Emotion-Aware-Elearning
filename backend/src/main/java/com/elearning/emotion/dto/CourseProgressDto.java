package com.elearning.emotion.dto;

import java.util.Map;

/**
 * Cây tiến độ phân cấp toàn diện cho 1 khóa học của học viên.
 * Cấp 3: Toàn bộ khóa học (progressPercent)
 * Cấp 2: Từng phần / Section (sections)
 * Cấp 1: Từng nhóm hoạt động / ContentGroup (groups)
 * Cấp 0: Từng hoạt động con / ContentItem (items)
 */
public record CourseProgressDto(
        String courseId,
        Float progressPercent,
        Map<String, SectionProgressDto> sections,
        Map<String, GroupProgressDto> groups,
        Map<String, ItemProgressDto> items
) {}
