package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderFeaturedReviewsRequest(
        @NotEmpty(message = "Danh sách ID đánh giá không được để trống")
        List<String> reviewIds
) {
}
