package com.elearning.emotion.dto.moderation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemAuditResultDto {
    private String itemId;
    private String ruleId;
    private boolean fixed;
    private String message;
    private String suggestion;
    private List<ModerationIssueDetailDto> remainingIssues;
}
