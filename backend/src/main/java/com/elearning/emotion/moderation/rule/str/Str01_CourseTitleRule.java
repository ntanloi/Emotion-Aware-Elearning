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
public class Str01_CourseTitleRule implements ModerationRule {

    @Override
    public String id() { return "STR-01"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        String title = ctx.getCourse().getTitle();
        JsonNode policy = ctx.getPolicy();
        int min = policy != null && policy.has("course") ? policy.path("course").path("titleMinChars").asInt(5) : 5;
        int max = policy != null && policy.has("course") ? policy.path("course").path("titleMaxChars").asInt(120) : 120;

        List<RuleIssue> issues = new ArrayList<>();
        if (title == null || title.trim().length() < min) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message(String.format("Tiêu đề khóa học quá ngắn (tối thiểu %d ký tự).", min))
                    .suggestion("Đặt tiêu đề rõ ràng, mô tả đúng nội dung hoặc mục tiêu khóa học.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        } else if (title.trim().length() > max) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message(String.format("Tiêu đề khóa học vượt quá giới hạn cho phép (tối đa %d ký tự).", max))
                    .suggestion("Rút gọn tiêu đề để đảm bảo tính chuyên nghiệp và hiển thị tốt trên các thiết bị.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        }

        // Kiểm tra không toàn ký tự đặc biệt
        if (title != null && !title.isBlank()) {
            boolean hasLetterOrDigit = title.chars().anyMatch(Character::isLetterOrDigit);
            if (!hasLetterOrDigit) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message("Tiêu đề khóa học không được chứa toàn ký tự đặc biệt.")
                        .suggestion("Bổ sung tên khóa học bằng chữ và số hợp lệ.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
            }
        }

        return issues;
    }
}
