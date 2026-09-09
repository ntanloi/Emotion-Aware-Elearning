package com.elearning.emotion.dto;

import com.elearning.emotion.entity.FlashcardProgress;
import java.time.LocalDateTime;
import java.util.List;

public record FlashcardProgressDto(
        String wordId, String word, String meaningVi, String status,
        LocalDateTime lastReviewedAt, LocalDateTime nextReviewAt,
        String ipa, String partOfSpeech, String imageUrl,
        String audioUkUrl, String audioUsUrl, List<VocabExampleDto> examples
) {
    /** examples duoc truyen vao rieng vi phai truy van VocabExampleRepository (khong the tu lam trong record) */
    public static FlashcardProgressDto from(FlashcardProgress p, List<VocabExampleDto> examples) {
        var w = p.getWord();
        return new FlashcardProgressDto(
                w.getId(), w.getWord(), w.getMeaningVi(),
                p.getStatus(), p.getLastReviewedAt(), p.getNextReviewAt(),
                w.getIpa(), w.getPartOfSpeech(),
                w.getImage() != null ? w.getImage().getUrl() : null,
                w.getAudioUk() != null ? w.getAudioUk().getUrl() : null,
                w.getAudioUs() != null ? w.getAudioUs().getUrl() : null,
                examples
        );
    }
}