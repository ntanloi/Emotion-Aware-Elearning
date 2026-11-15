package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class Str15_ProfileCoverageRule implements ModerationRule {

    @Override
    public String id() { return "STR-15"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        String profile = ctx.getProfile();
        if ("EXAM".equalsIgnoreCase(profile)) {
            return Collections.emptyList();
        }

        JsonNode policy = ctx.getPolicy();
        if (policy == null || !policy.has("profiles")) return Collections.emptyList();

        JsonNode profileNode = policy.path("profiles").path(profile);
        if (profileNode.isMissingNode() || !profileNode.has("requireSections")) {
            return Collections.emptyList();
        }

        List<RuleIssue> issues = new ArrayList<>();
        List<String> missingSections = new ArrayList<>();

        for (JsonNode secNode : profileNode.path("requireSections")) {
            String sec = secNode.asText();
            if (!ctx.isSectionOpened(sec)) {
                missingSections.add(sec);
            }
        }

        if (!missingSections.isEmpty()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message(String.format("Khóa học gắn định dạng '%s' nhưng còn thiếu các mục bắt buộc: %s.",
                            profile, String.join(", ", missingSections)))
                    .suggestion("Bổ sung nội dung cho các mục còn thiếu hoặc chuyển sang cấu hình khóa học chuyên đề (TOPIC).")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }

        return issues;
    }
}
