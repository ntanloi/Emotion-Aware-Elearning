package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,
        String bankId,
        String bankAccountNo,
        String bankAccountName,
        String cameraConsentVersion
) {}
