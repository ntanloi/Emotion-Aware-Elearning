package com.elearning.emotion.dto;

import com.elearning.emotion.entity.VocabExample;

public record VocabExampleDto(String id, String sentenceEn, String sentenceVi, String audioUrl) {
    public static VocabExampleDto from(VocabExample e) {
        return new VocabExampleDto(e.getId(), e.getSentenceEn(), e.getSentenceVi(),
                e.getAudio() != null ? e.getAudio().getUrl() : null);
    }
}
