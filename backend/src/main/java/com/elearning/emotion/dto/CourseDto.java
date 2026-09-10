package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Course;
import java.math.BigDecimal;

public record CourseDto(
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
        Long reviewCount
) {
    public static CourseDto from(Course c) {
        return from(c, null, 0L);
    }

    /** avgRating null hoac 0 review -> FE hien "Chưa có đánh giá" thay vi 0.0 ⭐ */
    public static CourseDto from(Course c, Double averageRating, Long reviewCount) {
        return new CourseDto(
                c.getId(),
                c.getTeacher().getId(),
                c.getTeacher().getFullName(),
                c.getTitle(),
                c.getDescription(),
                c.getLevel(),
                c.getDurationHours(),
                c.getPrice(),
                c.getOriginalPrice(),
                c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null,
                c.getStatus(),
                (averageRating != null && averageRating > 0) ? averageRating : null,
                reviewCount != null ? reviewCount : 0L
        );
    }
}
