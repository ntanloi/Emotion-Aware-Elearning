package com.elearning.emotion.dto;

/**
 * Tiến độ của 1 Part / Section trong khóa học (Level 2).
 * Tự động loại bỏ Section trống (0 hoạt động) khỏi mẫu số khi tính trung bình của cả khóa.
 */
public record SectionProgressDto(
        String sectionCode,
        Float progressPercent,
        boolean isCompleted,
        boolean isEmpty,
        int totalGroups,
        int completedGroups,
        int totalItems,
        int completedItems
) {}
