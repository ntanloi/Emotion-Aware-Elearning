package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record WalletPurchaseRequest(
        @NotBlank(message = "ID khóa học không được để trống")
        String courseId,

        Boolean acceptRewardTerms
) {}
