package com.elearning.emotion.dto;

import com.elearning.emotion.entity.WordChoicePair;

/**
 * DTO cho 1 ô trống của câu hỏi SENTENCE_FILL.
 * - id: id của blank (để FE gửi lại khi check)
 * - orderIndex: vị trí token {{n}} trong promptText (1-based)
 * - hint: gợi ý (optionB trong word_choice_pairs) — có thể null
 * - correctText: đáp án đúng (optionA trong word_choice_pairs) — CHỈ lộ cho giáo viên hoặc sau khi check
 */
public record SentenceFillBlankDto(String id, Integer orderIndex, String hint, String correctText) {
    /** Dành cho học viên làm bài — ẩn correctText */
    public static SentenceFillBlankDto forStudent(WordChoicePair p) {
        String hint = (p.getOptionB() != null && !p.getOptionB().isBlank()) ? p.getOptionB() : null;
        return new SentenceFillBlankDto(p.getId(), p.getOrderIndex(), hint, null);
    }

    /** Dành cho giáo viên xem lại — lộ correctText */
    public static SentenceFillBlankDto forTeacher(WordChoicePair p) {
        String hint = (p.getOptionB() != null && !p.getOptionB().isBlank()) ? p.getOptionB() : null;
        return new SentenceFillBlankDto(p.getId(), p.getOrderIndex(), hint, p.getOptionA());
    }
}
