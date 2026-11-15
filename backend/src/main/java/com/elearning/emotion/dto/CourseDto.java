package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Course;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CourseDto(
        String id,
        String teacherId,
        String teacherName,
        String title,
        String description,
        String level,
        String profile,
        Integer durationHours,
        BigDecimal price,
        BigDecimal originalPrice,
        String coverUrl,
        String status,
        Double averageRating,
        Long reviewCount,
        String rejectReason,
        LocalDateTime submittedAt
) {
    public static CourseDto from(Course c) {
        return fromPublic(c, null, 0L);
    }

    public static CourseDto from(Course c, Double averageRating, Long reviewCount) {
        return fromPublic(c, averageRating, reviewCount);
    }

    public static CourseDto fromPublic(Course c) {
        return fromPublic(c, null, 0L);
    }

    /** Dành cho học viên và khách vãng lai: không trả rejectReason và aiModerationReport */
    public static CourseDto fromPublic(Course c, Double averageRating, Long reviewCount) {
        return new CourseDto(
                c.getId(),
                c.getTeacher() != null ? c.getTeacher().getId() : null,
                c.getTeacher() != null ? c.getTeacher().getFullName() : null,
                c.getTitle(),
                c.getDescription(),
                c.getLevel(),
                c.getProfile(),
                c.getDurationHours(),
                c.getPrice(),
                c.getOriginalPrice(),
                c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null,
                c.getStatus(),
                (averageRating != null && averageRating > 0) ? averageRating : null,
                reviewCount != null ? reviewCount : 0L,
                null,
                c.getSubmittedAt()
        );
    }

    public static CourseDto fromTeacher(Course c) {
        return fromTeacher(c, null, 0L);
    }

    /** Dành cho giảng viên sở hữu: trả rejectReason để biết lý do bị từ chối */
    public static CourseDto fromTeacher(Course c, Double averageRating, Long reviewCount) {
        return new CourseDto(
                c.getId(),
                c.getTeacher() != null ? c.getTeacher().getId() : null,
                c.getTeacher() != null ? c.getTeacher().getFullName() : null,
                c.getTitle(),
                c.getDescription(),
                c.getLevel(),
                c.getProfile(),
                c.getDurationHours(),
                c.getPrice(),
                c.getOriginalPrice(),
                c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null,
                c.getStatus(),
                (averageRating != null && averageRating > 0) ? averageRating : null,
                reviewCount != null ? reviewCount : 0L,
                c.getRejectReason(),
                c.getSubmittedAt()
        );
    }
}
