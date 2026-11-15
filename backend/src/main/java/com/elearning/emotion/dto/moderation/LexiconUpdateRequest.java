package com.elearning.emotion.dto.moderation;

import lombok.Data;

@Data
public class LexiconUpdateRequest {
    private String category;
    private String matchType;
    private String pattern;
    private String severity;
    private String lang;
    private String scope;
    private Boolean active;
    private String note;
}
