package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/** knewIt=true (bam "Da biet") -> giang khoang on tap; false ("Chua biet") -> rut ngan lai */
public record FlashcardReviewRequest(@NotBlank String wordId, boolean knewIt) {}
