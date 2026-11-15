package com.elearning.emotion.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WithdrawalRequest(
        @NotNull(message = "Số tiền rút không được để trống")
        @DecimalMin(value = "1000", message = "Số tiền rút tối thiểu là 1,000 đ")
        BigDecimal amount,

        String bankId,

        @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
        String accountNo,

        @NotBlank(message = "Tên chủ tài khoản không được để trống")
        String accountName
) {}
