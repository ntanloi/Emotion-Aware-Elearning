package com.elearning.emotion.dto;

/**
 * Tiến độ của 1 Nhóm hoạt động / ContentGroup (Level 1).
 * Tính theo trung bình cộng tiến độ các hoạt động con (Level 0).
 */
public record GroupProgressDto(
        String groupId,
        Float progressPercent,
        boolean isCompleted,
        int totalItems,
        int completedItems
) {}
