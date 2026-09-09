package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/** practiceType CHI dung khi content_item.type = VOCAB_SET (FLASHCARD|MULTIPLE_CHOICE|MATCHING|LISTENING|FILL_BLANK) */
public record AttemptStartRequest(@NotBlank String contentItemId, String practiceType) {}
