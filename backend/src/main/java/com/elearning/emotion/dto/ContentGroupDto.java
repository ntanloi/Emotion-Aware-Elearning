package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ContentGroup;

import java.util.List;

public record ContentGroupDto(
        String id, String courseId, String sectionCode, String title, Integer orderIndex, List<ContentItemDto> items
) {
    public static ContentGroupDto from(ContentGroup g, List<ContentItemDto> items) {
        return new ContentGroupDto(g.getId(), g.getCourse().getId(), g.getSectionCode(), g.getTitle(), g.getOrderIndex(), items);
    }
}
