package com.elearning.emotion.dto;

import java.util.List;
import java.util.Map;

/**
 * Public: xem được bởi bất kỳ ai (kể cả khách vãng lai / học viên chưa đăng ký).
 * Chứa danh sách review, điểm trung bình, tổng số đánh giá, phân bố số sao (1..5) và thông tin phân trang/lọc (Phase 1).
 */
public record CourseReviewListDto(
        List<CourseReviewDto> reviews,
        double averageRating,
        long totalReviews,
        Map<Integer, Integer> distribution,
        int page,
        int size,
        long totalFiltered,
        int totalPages
) {
    public CourseReviewListDto(List<CourseReviewDto> reviews, double averageRating, long totalReviews, Map<Integer, Integer> distribution) {
        this(reviews, averageRating, totalReviews, distribution, 0, reviews != null ? Math.max(1, reviews.size()) : 10, reviews != null ? reviews.size() : 0, 1);
    }

    public CourseReviewListDto(List<CourseReviewDto> reviews, double averageRating, long totalReviews) {
        this(reviews, averageRating, totalReviews, Map.of(1, 0, 2, 0, 3, 0, 4, 0, 5, 0));
    }
}
