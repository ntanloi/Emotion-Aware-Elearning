package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminHideReviewRequest(
        @NotBlank(message = "Vui lòng nhập lý do ẩn")
        @Size(max = 500, message = "Lý do tối đa 500 ký tự")
        String reason
) {
}
