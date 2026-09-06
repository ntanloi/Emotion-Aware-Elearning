package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record MatchingPairRequest(@NotBlank String leftContent, @NotBlank String rightContent) {}
