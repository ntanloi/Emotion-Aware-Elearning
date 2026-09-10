package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ContentItem;

public record ContentItemDto(
        String id, String courseId, String sectionCode, String groupId, String type, String title, Integer orderIndex,
        Integer timeLimitMinutes, String videoUrl, String bodyHtml
) {
    public static ContentItemDto from(ContentItem c) {
        return new ContentItemDto(
                c.getId(), c.getCourse().getId(), c.getSectionCode(), c.getGroup() != null ? c.getGroup().getId() : null,
                c.getType(), c.getTitle(), c.getOrderIndex(),
                c.getTimeLimitMinutes(),
                c.getVideoMedia() != null ? c.getVideoMedia().getUrl() : null,
                c.getBodyHtml()
        );
    }
}
