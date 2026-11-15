package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminResolveReportRequest(
        @NotBlank(message = "Vui lòng chọn hành động xử lý")
        String action, // DISMISS | HIDE_REVIEW | HIDE_IMAGE
        String resolutionNote
) {
}
