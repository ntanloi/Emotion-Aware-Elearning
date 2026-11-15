package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Str02_CourseDescriptionRule implements ModerationRule {

    private final HtmlSanitizerService htmlSanitizerService;

    @Override
    public String id() { return "STR-02"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        String rawDesc = ctx.getCourse().getDescription();
        String bodyText = htmlSanitizerService.toBodyText(rawDesc);

        JsonNode policy = ctx.getPolicy();
        int min = policy != null && policy.has("course") ? policy.path("course").path("descriptionMinChars").asInt(100) : 100;

        if (bodyText.length() < min) {
            return List.of(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message(String.format("Phần mô tả khóa học còn quá ngắn (%d/%d ký tự thuần chữ).", bodyText.length(), min))
                    .suggestion("Bổ sung thông tin chi tiết về đối tượng học viên, mục tiêu đầu ra và phương pháp học tập.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        }

        return Collections.emptyList();
    }
}
