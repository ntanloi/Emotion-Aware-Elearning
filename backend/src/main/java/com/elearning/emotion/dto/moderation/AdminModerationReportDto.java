package com.elearning.emotion.dto.moderation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminModerationReportDto {
    private String runId;
    private String courseId;
    private String courseTitle;
    private String status;
    private int riskScore;
    private String riskLevel;
    private LocalDateTime submittedAt;
    private LocalDateTime finishedAt;

    private int totalIssues;
    private int blockerCount;
    private int errorCount;
    private int warningCount;
    private int infoCount;
    private int undecidedErrorCount;
    private int needFixCount;

    private boolean canApprove;
    private List<String> approvalBlockReasons;
    private List<String> checklistItems;
    private String readinessSnapshot;

    private List<ModerationIssueDetailDto> issues;
}
