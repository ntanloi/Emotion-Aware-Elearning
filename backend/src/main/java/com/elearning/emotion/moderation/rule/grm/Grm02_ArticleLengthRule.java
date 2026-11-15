package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Grm02_ArticleLengthRule implements ModerationRule {

    private final HtmlSanitizerService htmlSanitizerService;

    @Override
    public String id() { return "GRM-02"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minChars = policy != null && policy.has("sections") && policy.path("sections").has("GRAMMAR")
                ? policy.path("sections").path("GRAMMAR").path("minArticleChars").asInt(800) : 800;

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                String html = it.getBodyHtml();
                String bodyText = htmlSanitizerService.toBodyText(html);

                if (bodyText.length() < minChars) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Bài ngữ pháp '%s' có nội dung quá ngắn (%d ký tự thuần chữ, tối thiểu %d ký tự).",
                                    it.getTitle(), bodyText.length(), minChars))
                            .suggestion("Soạn thảo nội dung ngữ pháp đầy đủ gồm công thức, cách dùng, ví dụ và bài tập minh họa.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
