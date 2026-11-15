package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Txt06_FormattingExcessRule implements ModerationRule {

    private static final Pattern REPEATED_CHAR_PATTERN = Pattern.compile("(.)\\1{5,}");
    private static final Pattern EMOJI_PATTERN = Pattern.compile("[\\p{So}\\p{Cn}]");

    @Override
    public String id() { return "TXT-06"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        JsonNode policy = ctx.getPolicy();

        int maxEmoji = policy != null && policy.has("course")
                ? policy.path("course").path("titleMaxEmoji").asInt(3) : 3;
        double maxUpperRatio = policy != null && policy.has("text")
                ? policy.path("text").path("upperCaseRatioMax").asDouble(0.6) : 0.6;
        int minUpperLen = policy != null && policy.has("text")
                ? policy.path("text").path("upperCaseMinLength").asInt(20) : 20;

        String title = ctx.getCourse().getTitle();
        if (title != null && !title.isBlank()) {
            // Kiểm tra số emoji trong tiêu đề
            Matcher em = EMOJI_PATTERN.matcher(title);
            int emojiCount = 0;
            while (em.find()) emojiCount++;
            if (emojiCount > maxEmoji) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message(String.format("Tiêu đề chứa quá nhiều biểu tượng cảm xúc emoji (%d emoji, tối đa cho phép là %d).",
                                emojiCount, maxEmoji))
                        .suggestion("Giảm bớt biểu tượng emoji để đảm bảo tiêu đề trang nhã và chuyên nghiệp.")
                        .confidence(0.95f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
            }

            // Kiểm tra tỷ lệ chữ hoa ở tiêu đề
            if (title.length() >= minUpperLen) {
                long upperCount = title.chars().filter(Character::isUpperCase).count();
                long letterCount = title.chars().filter(Character::isLetter).count();
                if (letterCount >= minUpperLen && (double) upperCount / letterCount > maxUpperRatio) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("COURSE")
                            .targetId(ctx.getCourse().getId())
                            .message("Tiêu đề viết hoa toàn bộ hoặc có tỷ lệ chữ in hoa quá cao (> 60%).")
                            .suggestion("Chỉ viết hoa chữ cái đầu câu hoặc tên riêng.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                            .build());
                }
            }

            // Kiểm tra ký tự lặp
            Matcher rm = REPEATED_CHAR_PATTERN.matcher(title);
            if (rm.find()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message(String.format("Tiêu đề chứa chuỗi ký tự lặp bất thường: '%s'.", rm.group()))
                        .suggestion("Xóa các ký tự lặp không cần thiết.")
                        .confidence(0.95f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
            }
        }

        return issues;
    }
}
