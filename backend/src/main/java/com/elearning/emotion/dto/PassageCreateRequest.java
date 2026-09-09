package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/** Doan van/hoi thoai dung chung cho nhieu cau hoi - Part 3/4 (audio) va Part 6/7 (van ban) */
public record PassageCreateRequest(
        @NotBlank String contentItemId,
        String transcriptHtml,
        String passageHtml,
        String audioMediaId,
        String imageMediaId
) {}
