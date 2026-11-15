package com.elearning.emotion.dto;

import java.util.List;
import java.util.Map;

/**
 * Thống kê đánh giá khóa học dành cho giảng viên (Phase 2):
 * - Điểm trung bình, tổng số đánh giá, số đánh giá chưa phản hồi, số đánh giá có ảnh.
 * - Phân bố số sao (1..5).
 * - Xu hướng đánh giá theo từng tháng (6-12 tháng gần nhất).
 */
public record TeacherReviewStatsDto(
        double averageRating,
        long totalReviews,
        long unansweredCount,
        long withImagesCount,
        Map<Integer, Integer> ratingDistribution,
        List<MonthlyTrendItem> monthlyTrend
) {
    public record MonthlyTrendItem(
            String month, // Format "yyyy-MM" (ví dụ: "2026-09")
            long reviewCount,
            double averageRating
    ) {}
}
