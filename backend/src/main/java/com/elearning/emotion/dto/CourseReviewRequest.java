package com.elearning.emotion.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourseReviewRequest(
        @NotNull(message = "Vui long chon so sao danh gia")
        @Min(value = 1, message = "So sao toi thieu la 1")
        @Max(value = 5, message = "So sao toi da la 5")
        Integer rating,

        @Size(max = 2000, message = "Binh luan toi da 2000 ky tu")
        String comment
) {
}
