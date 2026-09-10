package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record VocabExampleRequest(
        @NotBlank String sentenceEn,
        @NotBlank String sentenceVi,
        String audioMediaId
) {}
