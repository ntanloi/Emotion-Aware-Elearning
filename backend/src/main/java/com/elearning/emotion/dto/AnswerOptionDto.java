package com.elearning.emotion.dto;

import com.elearning.emotion.entity.AnswerOption;

/** includeCorrect=false khi tra ve cho HOC VIEN lam bai (an dap an dung) */
public record AnswerOptionDto(String id, String label, String content, Boolean isCorrect) {
    public static AnswerOptionDto forStudent(AnswerOption o) {
        return new AnswerOptionDto(o.getId(), o.getLabel(), o.getContent(), null);
    }
    public static AnswerOptionDto forTeacher(AnswerOption o) {
        return new AnswerOptionDto(o.getId(), o.getLabel(), o.getContent(), o.getIsCorrect());
    }
}
