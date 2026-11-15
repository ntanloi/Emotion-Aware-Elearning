package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabCheckItemDto {
    private String word;

    @JsonProperty("part_of_speech")
    private String partOfSpeech;

    private String ipa;
}
