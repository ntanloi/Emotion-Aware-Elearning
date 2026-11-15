package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseReview;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO dành cho Quản trị viên (Admin) xem chi tiết và kiểm duyệt đánh giá:
 * - Bao gồm đầy đủ thông tin học viên (họ tên, email), trạng thái kiểm duyệt,
 *   lý do ẩn, số lượng báo cáo vi phạm và tất cả ảnh (kể cả ảnh đã bị ẩn).
 */
public record AdminReviewDto(
        String id,
        String courseId,
        String courseTitle,
        String studentId,
        String studentFullName,
        String studentEmail,
        Integer rating,
        String comment,
        String status,
        Integer progressAtReview,
        Boolean isEdited,
        Boolean allowFeature,
        String hiddenReason,
        String hiddenByName,
        LocalDateTime hiddenAt,
        String teacherReply,
        LocalDateTime teacherRepliedAt,
        long reportCount,
        List<ReviewImageDto> images,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminReviewDto from(CourseReview r, long reportCount) {
        if (r == null) return null;
        List<ReviewImageDto> imgDtos = r.getImages() != null
                ? r.getImages().stream().map(ReviewImageDto::from).toList()
                : List.of();

        return new AdminReviewDto(
                r.getId(),
                r.getCourse() != null ? r.getCourse().getId() : null,
                r.getCourse() != null ? r.getCourse().getTitle() : null,
                r.getUser() != null ? r.getUser().getId() : null,
                r.getUser() != null ? r.getUser().getFullName() : null,
                r.getUser() != null ? r.getUser().getEmail() : null,
                r.getRating(),
                r.getComment(),
                r.getStatus(),
                r.getProgressAtReview(),
                Boolean.TRUE.equals(r.getIsEdited()),
                Boolean.TRUE.equals(r.getAllowFeature()),
                r.getHiddenReason(),
                r.getHiddenBy() != null ? r.getHiddenBy().getFullName() : null,
                r.getHiddenAt(),
                r.getTeacherReply(),
                r.getTeacherRepliedAt(),
                reportCount,
                imgDtos,
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
