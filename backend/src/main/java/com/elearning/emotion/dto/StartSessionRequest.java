package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record StartSessionRequest(@NotBlank String lessonId) {}
