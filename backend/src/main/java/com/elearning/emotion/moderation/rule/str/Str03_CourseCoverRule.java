package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class Str03_CourseCoverRule implements ModerationRule {

    @Override
    public String id() { return "STR-03"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        JsonNode policy = ctx.getPolicy();
        boolean requireCover = policy == null || !policy.has("course") || policy.path("course").path("requireCover").asBoolean(true);

        if (requireCover && ctx.getCourse().getCoverMedia() == null) {
            return List.of(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message("Khóa học chưa có ảnh bìa minh họa (Cover Image).")
                    .suggestion("Tải lên ảnh bìa chuẩn tỷ lệ 16:9 để thu hút học viên.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        }

        return Collections.emptyList();
    }
}
