package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Txt09_MaliciousHtmlRule implements ModerationRule {

    private static final Pattern MALICIOUS_HTML = Pattern.compile(
            "(?i)<script[\\s>]|<iframe[\\s>]|\\bon[a-z]+\\s*=|javascript\\s*:"
    );

    @Override
    public String id() { return "TXT-09"; }

    @Override
    public String category() { return "SECURITY"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        // Kiểm tra mô tả khóa học
        scanHtml(ctx.getCourse().getDescription(), "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", issues, ctx);

        // Kiểm tra bài viết HTML
        if (ctx.getItems() != null) {
            for (ContentItem it : ctx.getItems()) {
                scanHtml(it.getBodyHtml(), "ITEM", it.getId(), "Nội dung bài học '" + it.getTitle() + "'", issues, ctx);
            }
        }

        return issues;
    }

    private void scanHtml(String html, String targetType, String targetId, String location,
                          List<RuleIssue> issues, ModerationContext ctx) {
        if (html == null || html.isBlank()) return;

        Matcher m = MALICIOUS_HTML.matcher(html);
        if (m.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("%s chứa mã HTML/JavaScript không an toàn: '%s'.", location, m.group()))
                    .suggestion("Loại bỏ thẻ script, iframe hoặc sự kiện JavaScript nguy hiểm khỏi nội dung.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }
    }
}
