package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record WordChoicePairRequest(
        @NotBlank String optionA,
        @NotBlank String optionB,
        @NotBlank @Pattern(regexp = "A|B", message = "correctOption phai la A hoac B") String correctOption
) {}
