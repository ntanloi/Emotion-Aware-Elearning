package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.GrammarTopic;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Grm06_TopicKeywordMatchRule implements ModerationRule {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String id() { return "GRM-06"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType()) && it.getTopicCode() != null) {
                GrammarTopic gt = ctx.getGrammarTopic(it.getTopicCode());
                if (gt == null) continue;

                String html = it.getBodyHtml();
                String plain = html != null ? Jsoup.parse(html).text() : "";
                String normContent = TextNormalizer.normalizeBase(plain);

                List<String> keywords = new ArrayList<>();
                extractKeywords(gt.getKeywordsEn(), keywords);
                extractKeywords(gt.getKeywordsVi(), keywords);

                int matchCount = 0;
                for (String kw : keywords) {
                    if (normContent.contains(TextNormalizer.normalizeBase(kw))) {
                        matchCount++;
                    }
                }

                if (!keywords.isEmpty() && matchCount < 2) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Nội dung bài viết '%s' chưa chứa các từ khóa đặc trưng của chủ điểm '%s' (khớp %d từ khóa).",
                                    it.getTitle(), gt.getTitleVi(), matchCount))
                            .suggestion("Bổ sung giải thích và từ khóa liên quan trực tiếp đến chủ điểm ngữ pháp này.")
                            .confidence(0.8f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }

    private void extractKeywords(String jsonArrayStr, List<String> result) {
        if (jsonArrayStr == null || jsonArrayStr.isBlank()) return;
        try {
            JsonNode node = objectMapper.readTree(jsonArrayStr);
            if (node.isArray()) {
                node.forEach(item -> {
                    String kw = item.asText();
                    if (kw != null && !kw.isBlank()) result.add(kw.trim());
                });
            }
        } catch (Exception ignored) {
            // Trường hợp dạng chuỗi cách nhau bằng dấu phẩy hoặc |
            String[] parts = jsonArrayStr.split("[,|]");
            for (String p : parts) {
                if (!p.isBlank()) result.add(p.trim());
            }
        }
    }
}
