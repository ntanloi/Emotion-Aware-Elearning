package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Enrollment;

public record EnrollmentDto(String id, String courseId, String courseTitle, Float progressPercent) {
    public static EnrollmentDto from(Enrollment e) {
        return new EnrollmentDto(e.getId(), e.getCourse().getId(), e.getCourse().getTitle(), e.getProgressPercent());
    }
}
