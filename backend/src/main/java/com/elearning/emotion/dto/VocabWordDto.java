package com.elearning.emotion.dto;

import com.elearning.emotion.entity.VocabWord;
import java.util.List;

public record VocabWordDto(
        String id, String word, String ipa, String partOfSpeech, String meaningVi,
        String imageUrl, String audioUkUrl, String audioUsUrl, List<VocabExampleDto> examples
) {
    public static VocabWordDto from(VocabWord w, List<VocabExampleDto> examples) {
        return new VocabWordDto(
                w.getId(), w.getWord(), w.getIpa(), w.getPartOfSpeech(), w.getMeaningVi(),
                w.getImage() != null ? w.getImage().getUrl() : null,
                w.getAudioUk() != null ? w.getAudioUk().getUrl() : null,
                w.getAudioUs() != null ? w.getAudioUs().getUrl() : null,
                examples
        );
    }
}
