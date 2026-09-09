package com.elearning.emotion.dto;

/** Field null = KHONG ghi de (giu nguyen), giong quy uoc ContentItemUpdateRequest */
public record PassageUpdateRequest(
        String transcriptHtml,
        String passageHtml,
        String audioMediaId,
        String imageMediaId
) {}
