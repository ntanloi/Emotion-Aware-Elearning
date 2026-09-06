package com.elearning.emotion.dto;

import com.elearning.emotion.entity.WordChoicePair;

/**
 * correctOption: "A"|"B" - CHI tra ve khi giao vien xem lai (forTeacher). Ben hoc vien
 * (forStudent) PHAI truyen null de khong lo dap an truoc khi lam bai.
 */
public record WordChoicePairDto(String id, Integer orderIndex, String optionA, String optionB, String correctOption) {
    public static WordChoicePairDto forTeacher(WordChoicePair p) {
        return new WordChoicePairDto(p.getId(), p.getOrderIndex(), p.getOptionA(), p.getOptionB(), p.getCorrectOption());
    }

    public static WordChoicePairDto forStudent(WordChoicePair p) {
        return new WordChoicePairDto(p.getId(), p.getOrderIndex(), p.getOptionA(), p.getOptionB(), null);
    }
}
