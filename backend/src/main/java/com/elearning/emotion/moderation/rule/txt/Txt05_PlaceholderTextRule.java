package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.LexiconService;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class Txt05_PlaceholderTextRule implements ModerationRule {

    private final LexiconService lexiconService;

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile(
            "(?i)\\b(?:lorem\\s+ipsum|test\\s+test|abcxyz|asdfgh|nội dung ở đây|chèn nội dung|placeholder)\\b"
    );

    @Override
    public String id() { return "TXT-05"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        scan(ctx.getCourse().getTitle(), "COURSE", ctx.getCourse().getId(), "Tiêu đề khóa học", issues, ctx);
        scan(ctx.getCourse().getDescription(), "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", issues, ctx);

        if (ctx.getItems() != null) {
            for (ContentItem it : ctx.getItems()) {
                scan(it.getTitle(), "ITEM", it.getId(), "Tiêu đề bài học '" + it.getTitle() + "'", issues, ctx);
                if (it.getBodyHtml() != null) {
                    scan(Jsoup.parse(it.getBodyHtml()).text(), "ITEM", it.getId(), "Nội dung bài học '" + it.getTitle() + "'", issues, ctx);
                }
            }
        }

        if (ctx.getQuestions() != null) {
            for (Question q : ctx.getQuestions()) {
                scan(q.getPromptText(), "QUESTION", q.getId(), "Đề câu hỏi", issues, ctx);
                scan(q.getExplanation(), "QUESTION", q.getId(), "Lời giải thích", issues, ctx);
            }
        }

        return issues;
    }

    private void scan(String text, String targetType, String targetId, String location,
                      List<RuleIssue> issues, ModerationContext ctx) {
        if (text == null || text.isBlank()) return;

        Matcher m = PLACEHOLDER_PATTERN.matcher(text);
        if (m.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("%s có chứa nội dung giữ chỗ tạm thời (placeholder): '%s'.", location, m.group()))
                    .suggestion("Hoàn thiện nội dung thật trước khi xuất bản khóa học.")
                    .confidence(0.95f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }
    }
}
