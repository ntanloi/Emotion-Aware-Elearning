package com.elearning.emotion.moderation.rule.dup;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Dup05_DuplicateLessonTextRule implements ModerationRule {

    @Override
    public String id() { return "DUP-05"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null || ctx.getItems().size() < 2) return issues;

        List<ContentItem> textItems = ctx.getItems().stream()
                .filter(i -> i.getBodyHtml() != null && !i.getBodyHtml().isBlank())
                .toList();

        for (int i = 0; i < textItems.size(); i++) {
            ContentItem it1 = textItems.get(i);
            String plain1 = TextNormalizer.normalizeBase(Jsoup.parse(it1.getBodyHtml()).text());
            if (plain1.length() < 100) continue;

            for (int j = i + 1; j < textItems.size(); j++) {
                ContentItem it2 = textItems.get(j);
                String plain2 = TextNormalizer.normalizeBase(Jsoup.parse(it2.getBodyHtml()).text());
                if (plain2.length() < 100) continue;

                if (plain1.equals(plain2)) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it2.getId())
                            .message(String.format("Nội dung bài học '%s' bị trùng lặp nguyên văn với bài học '%s'.",
                                    it2.getTitle(), it1.getTitle()))
                            .suggestion("Kiểm tra và cập nhật nội dung khác biệt cho từng bài học.")
                            .confidence(0.98f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
