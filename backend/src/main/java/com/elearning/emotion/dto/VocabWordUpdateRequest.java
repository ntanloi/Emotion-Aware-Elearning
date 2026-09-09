package com.elearning.emotion.dto;

import java.util.List;

/**
 * Sua 1 tu vung da tao. Field scalar null = KHONG ghi de (giu nguyen), giong quy uoc o
 * ContentItemUpdateRequest. Rieng `examples`: null = giu nguyen danh sach vi du cu; con neu
 * gui len (ke ca mang rong []) thi GHI DE TOAN BO vi du cu bang danh sach moi - dung y nghia
 * "khong dien vi du nao thi mat sau Flashcard se khong co phan vi du".
 */
public record VocabWordUpdateRequest(
        String word,
        String ipa,
        String partOfSpeech,
        String meaningVi,
        String imageMediaId,
        String audioUkMediaId,
        String audioUsMediaId,
        List<VocabExampleRequest> examples
) {}
