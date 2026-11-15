package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Grm10_DuplicateGrammarArticleRule implements ModerationRule {

    @Override
    public String id() { return "GRM-10"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.size() < 2) return issues;

        List<ContentItem> articles = grammarItems.stream()
                .filter(i -> "GRAMMAR_ARTICLE".equalsIgnoreCase(i.getType()))
                .toList();

        for (int i = 0; i < articles.size(); i++) {
            ContentItem a1 = articles.get(i);
            String t1 = a1.getTopicCode() != null ? a1.getTopicCode().trim().toUpperCase() : "";
            String text1 = a1.getBodyHtml() != null ? TextNormalizer.normalizeBase(Jsoup.parse(a1.getBodyHtml()).text()) : "";

            for (int j = i + 1; j < articles.size(); j++) {
                ContentItem a2 = articles.get(j);
                String t2 = a2.getTopicCode() != null ? a2.getTopicCode().trim().toUpperCase() : "";

                if (!t1.isEmpty() && t1.equals(t2)) {
                    String text2 = a2.getBodyHtml() != null ? TextNormalizer.normalizeBase(Jsoup.parse(a2.getBodyHtml()).text()) : "";
                    if (!text1.isEmpty() && text1.equals(text2)) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("ITEM")
                                .targetId(a2.getId())
                                .message(String.format("Hai bài viết '%s' và '%s' cùng chủ điểm '%s' và có nội dung trùng lặp nhau.",
                                        a1.getTitle(), a2.getTitle(), t1))
                                .suggestion("Hợp nhất nội dung hoặc xóa bớt một bài để tránh gây trùng lặp cho học viên.")
                                .confidence(0.95f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
