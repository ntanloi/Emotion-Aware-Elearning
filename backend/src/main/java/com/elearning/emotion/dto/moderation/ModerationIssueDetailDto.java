package com.elearning.emotion.dto.moderation;

import com.elearning.emotion.entity.ModerationIssue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationIssueDetailDto {
    private String id;
    private String issueKey;
    private String ruleId;
    private String category;
    private String severity;
    private String source;
    private String targetType;
    private String targetId;
    private String message;
    private String suggestion;
    private String evidence;
    private Float confidence;
    private String jumpTo;

    // Quyết định hiện tại của Admin nếu đã có
    private ModerationDecisionDto decision;

    public static ModerationIssueDetailDto from(ModerationIssue issue, ModerationDecisionDto decision, String jumpTo) {
        return ModerationIssueDetailDto.builder()
                .id(issue.getId())
                .issueKey(issue.getIssueKey())
                .ruleId(issue.getRuleId())
                .category(issue.getCategory())
                .severity(issue.getSeverity())
                .source(issue.getSource())
                .targetType(issue.getTargetType())
                .targetId(issue.getTargetId())
                .message(issue.getMessage())
                .suggestion(issue.getSuggestion())
                .evidence(issue.getEvidence())
                .confidence(issue.getConfidence())
                .jumpTo(jumpTo)
                .decision(decision)
                .build();
    }
}
