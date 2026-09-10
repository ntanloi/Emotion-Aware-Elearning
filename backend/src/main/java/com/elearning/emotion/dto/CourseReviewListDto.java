package com.elearning.emotion.dto;

import java.util.List;

/** Public: xem duoc boi bat ky ai (ke ca khach vang lai / hoc vien chua dang ky). */
public record CourseReviewListDto(
        List<CourseReviewDto> reviews,
        double averageRating,
        long totalReviews
) {
}
