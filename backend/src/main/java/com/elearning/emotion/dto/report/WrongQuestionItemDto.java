package com.elearning.emotion.dto.report;

public record WrongQuestionItemDto(
        String questionId,
        String promptText,
        String questionKind,
        String tag,
        String sectionCode,
        String contentItemId,
        String contentItemTitle,
        String courseTitle,
        String imageUrl,
        String audioUrl,
        String selectedOptionId,
        String selectedOptionLabel,
        String selectedOptionContent,
        String correctOptionId,
        String correctOptionLabel,
        String correctOptionContent,
        String submittedText,
        String explanation,
        int wrongCount,
        String lastAttemptedAt
) {}
