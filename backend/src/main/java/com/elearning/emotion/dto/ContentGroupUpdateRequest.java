package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record ContentGroupUpdateRequest(@NotBlank String title) {}
