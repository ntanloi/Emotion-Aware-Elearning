package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record TextAnswerRequest(@NotBlank String correctText, String hint) {}
