package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateContentReportRequest(
        @NotBlank(message = "Loại đối tượng không được để trống")
        String targetType, // COURSE | TEACHER | CONTENT_ITEM | REVIEW

        @NotBlank(message = "Mã đối tượng không được để trống")
        String targetId,

        @NotBlank(message = "Lý do báo cáo không được để trống")
        String reason, // COPYRIGHT | INAPPROPRIATE_CONTENT | SPAM | HARASSMENT | OTHER

        String description
) {}
