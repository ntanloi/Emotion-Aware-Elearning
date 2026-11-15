package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Grm04_ExampleCountRule implements ModerationRule {

    private static final Pattern ENGLISH_SENTENCE = Pattern.compile(
            "(?:[A-Z][a-zA-Z\\s,;:'\"\\-]{10,}[.?!])"
    );

    @Override
    public String id() { return "GRM-04"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minExamples = policy != null && policy.has("sections") && policy.path("sections").has("GRAMMAR")
                ? policy.path("sections").path("GRAMMAR").path("minExampleSentences").asInt(3) : 3;

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                String html = it.getBodyHtml();
                String text = html != null ? Jsoup.parse(html).text() : "";

                Matcher m = ENGLISH_SENTENCE.matcher(text);
                int count = 0;
                while (m.find()) {
                    count++;
                }

                if (count < minExamples) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Bài ngữ pháp '%s' có quá ít câu ví dụ tiếng Anh (%d câu, tối thiểu %d câu).",
                                    it.getTitle(), count, minExamples))
                            .suggestion("Thêm các câu ví dụ tiếng Anh thực tế minh họa cách sử dụng cấu trúc ngữ pháp.")
                            .confidence(0.85f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
