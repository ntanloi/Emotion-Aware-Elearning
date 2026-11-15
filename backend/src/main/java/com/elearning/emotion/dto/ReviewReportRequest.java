package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewReportRequest(
        @NotBlank(message = "Vui lòng chọn lý do báo cáo")
        String reason,
        @Size(max = 1000, message = "Chi tiết báo cáo tối đa 1000 ký tự")
        String details,
        String imageId
) {
}
