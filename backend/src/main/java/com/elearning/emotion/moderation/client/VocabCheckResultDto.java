package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class VocabCheckResultDto {
    private String word;

    @JsonProperty("in_dictionary")
    private boolean inDictionary;

    @Builder.Default
    @JsonProperty("valid_pos")
    private List<String> validPos = Collections.emptyList();

    @JsonProperty("pos_match")
    private boolean posMatch;

    @JsonProperty("ipa_match")
    private boolean ipaMatch;

    @JsonProperty("frequency_zipf")
    private double frequencyZipf;

    @JsonProperty("is_rare")
    private boolean isRare;

    @Builder.Default
    private List<String> suggestions = Collections.emptyList();
}
