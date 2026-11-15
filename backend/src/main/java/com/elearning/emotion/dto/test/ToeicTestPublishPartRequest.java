package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ToeicTestPublishPartRequest(
        @NotNull(message = "partNo khong duoc de trong")
        @Min(1) @Max(7)
        Integer partNo,

        @NotBlank(message = "sourceContentItemId khong duoc de trong")
        String sourceContentItemId
) {}
