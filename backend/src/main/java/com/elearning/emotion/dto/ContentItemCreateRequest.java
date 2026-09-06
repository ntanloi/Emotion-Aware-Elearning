package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

public record ContentItemCreateRequest(
        @NotBlank String courseId,
        @NotBlank String sectionCode,
        String groupId,        // null = hoat dong truc thuoc thang muc sidebar, khong nam trong Nhom nao
        @NotBlank String type, // VIDEO_LECTURE|VOCAB_SET|GRAMMAR_ARTICLE|PRACTICE_TEST|DICTATION_SET
        @NotBlank String title,
        Integer timeLimitMinutes,
        String videoMediaId,   // bat buoc neu type=VIDEO_LECTURE
        String bodyHtml        // dung neu type=GRAMMAR_ARTICLE
) {}
