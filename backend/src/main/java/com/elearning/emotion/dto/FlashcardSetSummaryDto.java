package com.elearning.emotion.dto;

import java.util.List;

public record FlashcardSetSummaryDto(
        String id,
        String contentItemId,
        String title,
        String rawTitle,
        String courseId,
        String courseTitle,
        Integer setIndex,
        String description,
        String category,
        String badge,
        int wordCount,
        List<String> sampleWords,
        List<SampleWordDetail> sampleWordDetails
) {
    public record SampleWordDetail(String word, String meaningVi) {}
}
