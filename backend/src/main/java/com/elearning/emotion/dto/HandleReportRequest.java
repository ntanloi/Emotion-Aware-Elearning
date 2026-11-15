package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record HandleReportRequest(
        @NotBlank(message = "Hành động xử lý không được để trống")
        String action, // DISMISS | WARN | SUSPEND_COURSE | LOCK_USER

        String adminNote
) {}
