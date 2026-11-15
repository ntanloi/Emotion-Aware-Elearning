package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.NotBlank;

public record TestRejectRequest(
        @NotBlank(message = "Lý do không được để trống")
        String reason
) {}
