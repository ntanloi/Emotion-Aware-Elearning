package com.elearning.emotion.dto;

/**
 * Tiến độ của 1 hoạt động con / ContentItem (Level 0).
 * - VIDEO_LECTURE: Xem >= 80% (8/10) video -> 100%.
 * - PRACTICE_TEST / GRAMMAR / DICTATION: tính theo số câu duy nhất đã làm / tổng câu hỏi (1/N mỗi câu).
 * - VOCAB_SET: xem hết toàn bộ flashcard trong list -> 100%.
 */
public record ItemProgressDto(
        String itemId,
        Float progressPercent,
        boolean isCompleted,
        Integer totalQuestions,
        Integer answeredQuestions
) {}
