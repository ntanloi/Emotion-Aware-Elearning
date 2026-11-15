package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Course;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminCourseDto(
        String id,
        String teacherId,
        String teacherName,
        String title,
        String description,
        String level,
        Integer durationHours,
        BigDecimal price,
        BigDecimal originalPrice,
        String coverUrl,
        String status,
        Double averageRating,
        Long reviewCount,
        String rejectReason,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        String reviewedByName,
        LocalDateTime contentChangedAt,
        String aiModerationReport
) {
    public static AdminCourseDto from(Course c) {
        return from(c, c != null ? c.getAvgRating() : null, c != null && c.getReviewCount() != null ? c.getReviewCount() : 0L);
    }

    public static AdminCourseDto from(Course c, Double averageRating, Number reviewCount) {
        return new AdminCourseDto(
                c.getId(),
                c.getTeacher() != null ? c.getTeacher().getId() : null,
                c.getTeacher() != null ? c.getTeacher().getFullName() : null,
                c.getTitle(),
                c.getDescription(),
                c.getLevel(),
                c.getDurationHours(),
                c.getPrice(),
                c.getOriginalPrice(),
                c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null,
                c.getStatus(),
                (averageRating != null && averageRating > 0) ? averageRating : null,
                reviewCount != null ? reviewCount.longValue() : 0L,
                c.getRejectReason(),
                c.getSubmittedAt(),
                c.getReviewedAt(),
                c.getReviewedBy() != null ? c.getReviewedBy().getFullName() : null,
                c.getContentChangedAt(),
                c.getAiModerationReport()
        );
    }
}
