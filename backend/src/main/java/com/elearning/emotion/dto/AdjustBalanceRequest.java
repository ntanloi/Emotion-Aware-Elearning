package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AdjustBalanceRequest(
        @NotBlank(message = "ID học viên không được để trống")
        String userId,

        @NotBlank(message = "Loại ngăn tiền (CASH hoặc BONUS) không được để trống")
        String bucket,

        @NotNull(message = "Số tiền điều chỉnh không được để trống")
        BigDecimal amount,

        @NotBlank(message = "Lý do điều chỉnh không được để trống")
        String note
) {}
