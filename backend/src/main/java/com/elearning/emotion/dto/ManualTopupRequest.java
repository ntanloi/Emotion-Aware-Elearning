package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record ManualTopupRequest(
        @NotBlank(message = "Mã giao dịch không được để trống")
        String transactionId,

        @NotBlank(message = "ID học viên không được để trống")
        String userId,

        @NotBlank(message = "Ghi chú đối soát không được để trống")
        String note
) {}
