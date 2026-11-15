package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseReview;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO đánh giá khóa học công khai (Phase 0 - Phase 2):
 * - Không để lộ studentId (bảo mật/quyền riêng tư).
 * - Tên học viên được rút gọn ("Nguyễn V.").
 * - Chứa danh sách ảnh, % tiến độ khi đánh giá, trạng thái, cờ đã sửa, cờ đồng ý giới thiệu và phản hồi của giảng viên.
 */
public record CourseReviewDto(
        String id,
        String courseId,
        String studentName,
        Integer rating,
        String comment,
        String status,
        Integer progressAtReview,
        Boolean isEdited,
        Boolean allowFeature,
        List<ReviewImageDto> images,
        String teacherReply,
        LocalDateTime teacherRepliedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static CourseReviewDto from(CourseReview r) {
        if (r == null) return null;
        String rawName = (r.getUser() != null) ? r.getUser().getFullName() : "Học viên";
        String anonymized = anonymizeName(rawName);
        List<ReviewImageDto> imgDtos = (r.getImages() != null)
                ? r.getImages().stream()
                    .filter(img -> !Boolean.TRUE.equals(img.getIsHidden()))
                    .map(ReviewImageDto::from)
                    .toList()
                : List.of();

        return new CourseReviewDto(
                r.getId(),
                r.getCourse() != null ? r.getCourse().getId() : null,
                anonymized,
                r.getRating(),
                r.getComment(),
                r.getStatus(),
                r.getProgressAtReview(),
                Boolean.TRUE.equals(r.getIsEdited()),
                Boolean.TRUE.equals(r.getAllowFeature()),
                imgDtos,
                r.getTeacherReply(),
                r.getTeacherRepliedAt(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }

    /**
     * Rút gọn họ tên bảo mật quyền riêng tư: "Nguyễn Văn Nam" -> "Nguyễn V."
     */
    public static String anonymizeName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "Học viên";
        }
        String trimmed = fullName.trim();
        String[] parts = trimmed.split("\\s+");
        if (parts.length == 1) {
            return parts[0];
        }
        String first = parts[0];
        String nextWord = parts[1];
        String initial = nextWord.isEmpty() ? "" : nextWord.substring(0, 1).toUpperCase();
        return first + " " + initial + ".";
    }
}
