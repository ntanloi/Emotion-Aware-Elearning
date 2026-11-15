package com.elearning.emotion.dto.report;

public record DueWordItemDto(
        String wordId,
        String word,
        String ipa,
        String partOfSpeech,
        String meaningVi,
        String audioUkUrl,
        String audioUsUrl,
        String imageUrl,
        String status,
        String nextReviewAt,
        long daysOverdue,
        String exampleEn,
        String exampleVi
) {}
