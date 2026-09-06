package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Thông tin 1 ô trống khi giáo viên tạo câu hỏi SENTENCE_FILL.
 * - correctText: đáp án đúng (bắt buộc)
 * - hint: gợi ý hiển thị trong ô trống (tuỳ chọn, có thể null)
 */
public record SentenceFillBlankRequest(
        @NotBlank String correctText,
        String hint
) {}
