package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record VocabWordCreateRequest(
        @NotBlank String word,
        String ipa,
        String partOfSpeech,
        @NotBlank String meaningVi,
        String imageMediaId,
        String audioUkMediaId,
        String audioUsMediaId,
        List<VocabExampleRequest> examples
) {}
