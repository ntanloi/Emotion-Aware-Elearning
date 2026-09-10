package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseReview;
import java.time.LocalDateTime;

public record CourseReviewDto(
        String id,
        String courseId,
        String studentId,
        String studentName,
        Integer rating,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static CourseReviewDto from(CourseReview r) {
        return new CourseReviewDto(
                r.getId(),
                r.getCourse().getId(),
                r.getUser().getId(),
                r.getUser().getFullName(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
