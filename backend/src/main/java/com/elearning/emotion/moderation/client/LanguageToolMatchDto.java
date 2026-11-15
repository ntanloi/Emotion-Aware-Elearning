package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class LanguageToolMatchDto {
    private String message;
    private String shortMessage;
    private int offset;
    private int length;
    private String ruleId;
    private String ruleDescription;
    private String issueType; // misspelling, grammar, typographical, etc.
    private List<String> replacements;
}
