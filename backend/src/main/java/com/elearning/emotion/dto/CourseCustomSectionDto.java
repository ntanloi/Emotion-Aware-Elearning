package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseCustomSection;

/**
 * sectionCode = "CUSTOM_" + id — frontend dùng để navigate giống 10 mục cố định.
 */
public record CourseCustomSectionDto(String id, String courseId, String title, String icon,
                                     Integer orderIndex, String sectionCode) {
    public static CourseCustomSectionDto from(CourseCustomSection s) {
        return new CourseCustomSectionDto(
                s.getId(), s.getCourse().getId(), s.getTitle(), s.getIcon(),
                s.getOrderIndex(), "CUSTOM_" + s.getId());
    }
}
