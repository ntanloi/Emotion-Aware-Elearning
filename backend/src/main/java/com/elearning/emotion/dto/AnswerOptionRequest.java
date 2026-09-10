package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record AnswerOptionRequest(String label, @NotBlank String content, boolean isCorrect) {}
