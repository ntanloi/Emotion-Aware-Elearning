package com.elearning.emotion.moderation.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ReadinessReportDto {
    boolean canSubmit;
    int policyVersion;
    int blockerCount;
    int warningCount;
    List<SectionReadinessDto> sections;
    List<RuleIssue> blockers;
    List<RuleIssue> warnings;

    @Value
    @Builder
    public static class SectionReadinessDto {
        String code;
        String label;
        String status; // PASSED | BLOCKED | NOT_OPEN
        List<RequirementDto> requirements;
    }

    @Value
    @Builder
    public static class RequirementDto {
        String key;
        String label;
        int required;
        int actual;
        boolean met;
        String severity; // BLOCKER | WARNING | INFO
        String jumpTo;
    }
}
