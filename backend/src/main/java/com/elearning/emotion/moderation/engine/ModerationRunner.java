package com.elearning.emotion.moderation.engine;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationRunner {

    @Getter
    @Builder
    public static class RunResult {
        private final List<RuleIssue> issues;
        private final int riskScore;
        private final String riskLevel; // LOW | MEDIUM | HIGH
        private final int blockerCount;
        private final int errorCount;
        private final int warningCount;
        private final int infoCount;
    }

    /**
     * Chạy toàn bộ các luật được chỉ định trên ModerationContext với cơ chế chịu lỗi từng luật
     */
    public RunResult runRules(Collection<ModerationRule> rules, ModerationContext ctx) {
        List<RuleIssue> allIssues = new ArrayList<>();

        for (ModerationRule rule : rules) {
            try {
                List<RuleIssue> issues = rule.evaluate(ctx);
                if (issues != null && !issues.isEmpty()) {
                    allIssues.addAll(issues);
                }
            } catch (Exception ex) {
                log.error("Lỗi thực thi luật {}: {}", rule.id(), ex.getMessage(), ex);
                // Tạo issue loại SYSTEM mức INFO (không chặn duyệt, không tính điểm)
                allIssues.add(RuleIssue.builder()
                        .ruleId("SYS-01")
                        .category("SYSTEM")
                        .severity(Severity.INFO)
                        .source("TOOL")
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message("Luật " + rule.id() + " gặp sự cố khi đánh giá: " + ex.getMessage())
                        .suggestion("Kiểm tra lại cấu trúc dữ liệu hoặc liên hệ bộ phận kỹ thuật")
                        .confidence(1.0f)
                        .build());
            }
        }

        // Tính điểm rủi ro & phân loại mức độ rủi ro (SPEC.md Mục 9)
        JsonNode policy = ctx.getPolicy();
        int highScore = policy != null && policy.has("risk") ? policy.path("risk").path("highScore").asInt(40) : 40;
        int mediumScore = policy != null && policy.has("risk") ? policy.path("risk").path("mediumScore").asInt(15) : 15;

        int score = 0;
        int blockers = 0;
        int errors = 0;
        int warnings = 0;
        int infos = 0;
        boolean hasSafetySecurityIssue = false;

        for (RuleIssue issue : allIssues) {
            if ("SYSTEM".equalsIgnoreCase(issue.getCategory())) {
                continue; // Lỗi SYSTEM không tính điểm
            }
            if ("SAFETY".equalsIgnoreCase(issue.getCategory()) || "SECURITY".equalsIgnoreCase(issue.getCategory())) {
                hasSafetySecurityIssue = true;
            }

            if (issue.getSeverity() == Severity.BLOCKER) {
                blockers++;
                score += 20;
            } else if (issue.getSeverity() == Severity.ERROR) {
                errors++;
                score += 10;
            } else if (issue.getSeverity() == Severity.WARNING) {
                warnings++;
                score += 3;
            } else if (issue.getSeverity() == Severity.INFO) {
                infos++;
            }
        }

        String riskLevel;
        if (score >= highScore || hasSafetySecurityIssue) {
            riskLevel = "HIGH";
        } else if (score >= mediumScore) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        return RunResult.builder()
                .issues(allIssues)
                .riskScore(score)
                .riskLevel(riskLevel)
                .blockerCount(blockers)
                .errorCount(errors)
                .warningCount(warnings)
                .infoCount(infos)
                .build();
    }
}
