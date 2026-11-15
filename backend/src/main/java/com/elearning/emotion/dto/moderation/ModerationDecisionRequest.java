package com.elearning.emotion.dto.moderation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationDecisionRequest {
    /** ACCEPT | DISMISS | NEED_FIX */
    private String decision;
    private String note;
}
