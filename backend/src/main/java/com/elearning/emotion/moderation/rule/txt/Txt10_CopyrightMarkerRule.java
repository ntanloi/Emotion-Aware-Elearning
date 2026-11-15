package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Txt10_CopyrightMarkerRule implements ModerationRule {

    private static final Pattern COPYRIGHT_PATTERN = Pattern.compile(
            "(?i)\\b(?:bản quyền thuộc về|all rights reserved|copyright\\s*(?:by|©)|nghiêm cấm sao chép)\\b"
    );

    @Override
    public String id() { return "TXT-10"; }

    @Override
    public String category() { return "COPYRIGHT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        scan(ctx.getCourse().getTitle(), "COURSE", ctx.getCourse().getId(), "Tiêu đề khóa học", issues, ctx);
        scan(ctx.getCourse().getDescription(), "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", issues, ctx);

        if (ctx.getItems() != null) {
            for (ContentItem it : ctx.getItems()) {
                if (it.getBodyHtml() != null) {
                    scan(Jsoup.parse(it.getBodyHtml()).text(), "ITEM", it.getId(), "Nội dung bài học '" + it.getTitle() + "'", issues, ctx);
                }
            }
        }

        return issues;
    }

    private void scan(String text, String targetType, String targetId, String location,
                      List<RuleIssue> issues, ModerationContext ctx) {
        if (text == null || text.isBlank()) return;

        Matcher m = COPYRIGHT_PATTERN.matcher(text);
        if (m.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("%s có chứa tuyên bố hoặc dấu hiệu bản quyền: '%s'.", location, m.group()))
                    .suggestion("Cần xác nhận bạn là tác giả hoặc có giấy phép sử dụng hợp pháp tài liệu này.")
                    .confidence(0.9f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }
    }
}
