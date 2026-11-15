package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ContentItem;

public record ContentItemDto(
        String id,
        String courseId,
        String courseTitle,
        String sectionCode,
        String groupId,
        String groupTitle,
        String type,
        String title,
        Integer orderIndex,
        Integer timeLimitMinutes,
        String videoUrl,
        String bodyHtml,
        Boolean isPreview,
        Integer previewDurationSeconds
) {
    public static ContentItemDto from(ContentItem c) {
        return new ContentItemDto(
                c.getId(),
                c.getCourse() != null ? c.getCourse().getId() : null,
                c.getCourse() != null ? c.getCourse().getTitle() : null,
                c.getSectionCode(),
                c.getGroup() != null ? c.getGroup().getId() : null,
                c.getGroup() != null ? c.getGroup().getTitle() : null,
                c.getType(),
                c.getTitle(),
                c.getOrderIndex(),
                c.getTimeLimitMinutes(),
                c.getVideoMedia() != null ? c.getVideoMedia().getUrl() : null,
                c.getBodyHtml(),
                c.getIsPreview() != null ? c.getIsPreview() : false,
                c.getPreviewDurationSeconds()
        );
    }

    /**
     * B1: Ban tom luoc cau truc (outline) cho hoc vien chua ghi danh.
     * Neu la bai hoc thu (isPreview = true) thi van cung cap videoUrl va thoi luong hoc thu de xem thu.
     * Nguoc lai an videoUrl va bodyHtml.
     */
    public static ContentItemDto outline(ContentItem c) {
        boolean canPreview = Boolean.TRUE.equals(c.getIsPreview());
        return new ContentItemDto(
                c.getId(),
                c.getCourse() != null ? c.getCourse().getId() : null,
                c.getCourse() != null ? c.getCourse().getTitle() : null,
                c.getSectionCode(),
                c.getGroup() != null ? c.getGroup().getId() : null,
                c.getGroup() != null ? c.getGroup().getTitle() : null,
                c.getType(),
                c.getTitle(),
                c.getOrderIndex(),
                c.getTimeLimitMinutes(),
                canPreview && c.getVideoMedia() != null ? c.getVideoMedia().getUrl() : null,
                canPreview ? c.getBodyHtml() : null,
                canPreview,
                c.getPreviewDurationSeconds()
        );
    }
}
