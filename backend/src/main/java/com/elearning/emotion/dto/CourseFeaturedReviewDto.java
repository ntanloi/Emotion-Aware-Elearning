package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseFeaturedReview;

import java.time.LocalDateTime;

/**
 * DTO dành cho Đánh giá tiêu biểu được ghim lên trang giới thiệu khóa học (Phase 4):
 * - Kèm nhãn "Do giảng viên chọn".
 * - Tên học viên được rút gọn ("Nguyễn V.").
 * - Chứa đầy đủ thông tin sao, nhận xét, hình ảnh thực tế và phản hồi giảng viên.
 */
public record CourseFeaturedReviewDto(
        String id,
        int sortOrder,
        LocalDateTime featuredAt,
        CourseReviewDto review
) {
    public static CourseFeaturedReviewDto from(CourseFeaturedReview cfr) {
        if (cfr == null) return null;
        return new CourseFeaturedReviewDto(
                cfr.getId(),
                cfr.getSortOrder() != null ? cfr.getSortOrder() : 0,
                cfr.getFeaturedAt(),
                CourseReviewDto.from(cfr.getReview())
        );
    }
}
