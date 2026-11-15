package com.elearning.emotion.dto.moderation;

import com.elearning.emotion.entity.ModerationIssueDecision;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationDecisionDto {
    private String id;
    private String issueKey;
    private String decision;
    private String note;
    private String decidedByName;
    private LocalDateTime decidedAt;

    public static ModerationDecisionDto from(ModerationIssueDecision d) {
        if (d == null) return null;
        return ModerationDecisionDto.builder()
                .id(d.getId())
                .issueKey(d.getIssueKey())
                .decision(d.getDecision())
                .note(d.getNote())
                .decidedByName(d.getDecidedBy() != null ? d.getDecidedBy().getFullName() : null)
                .decidedAt(d.getDecidedAt())
                .build();
    }
}
