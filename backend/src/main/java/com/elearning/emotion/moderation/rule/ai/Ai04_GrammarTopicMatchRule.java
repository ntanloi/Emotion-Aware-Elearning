package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.client.LlmAnalysisResponse;
import com.elearning.emotion.moderation.client.ModerationLlmClient;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class Ai04_GrammarTopicMatchRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-04"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled()) return issues;

        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        ensurePromptLoaded();

        for (ContentItem it : grammarItems) {
            if (!"GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType()) || it.getBodyHtml() == null) continue;

            String plainText = Jsoup.parse(it.getBodyHtml()).text();
            if (plainText.length() < 100) continue;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("title", it.getTitle());
            data.put("content", plainText.length() > 3000 ? plainText.substring(0, 3000) : plainText);

            String json = toJson(data);
            String contentHash = ctx.getCourse().getId() + ":grm_match:" + it.getId();

            LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
            if (!res.isSuccess()) continue;

            try {
                JsonNode root = objectMapper.readTree(res.getRawJson());
                boolean topicMatch = root.path("topic_match").asBoolean(true);
                if (!topicMatch) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Nội dung bài giảng '%s' có dấu hiệu không khớp với chủ điểm ngữ pháp được khai báo.", it.getTitle()))
                            .suggestion("Rà soát lại tiêu đề bài giảng hoặc cập nhật nội dung phù hợp với chủ điểm ngữ pháp.")
                            .confidence(0.85f)
                            .model(llmClient.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                JsonNode statements = root.path("suspicious_statements");
                if (statements.isArray()) {
                    for (JsonNode st : statements) {
                        String quote = st.path("quote").asText("").trim();
                        String why = st.path("why").asText("Phát biểu có nghi vấn về quy tắc ngữ pháp");

                        // SPEC mục 8: Bắt buộc loại mọi phát hiện không kèm đoạn trích có thật trong dữ liệu (so khớp chuỗi)
                        if (!quote.isBlank() && plainText.contains(quote)) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .source("LLM")
                                    .targetType("ITEM")
                                    .targetId(it.getId())
                                    .message(String.format("Phát biểu khả nghi trong bài '%s': \"%s\". Lý do: %s.",
                                            it.getTitle(), quote, why))
                                    .suggestion("Kiểm tra lại tính chính xác của quy tắc ngữ pháp đã viết.")
                                    .confidence(0.88f)
                                    .evidence(quote)
                                    .model(llmClient.getModel())
                                    .promptVersion(PROMPT_VERSION)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-04: {}", ex.getMessage());
            }
        }

        return issues;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private synchronized void ensurePromptLoaded() {
        if (!promptTemplate.isEmpty()) return;
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai04_grammar.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
            }
        } catch (Exception e) {
            promptTemplate = "Kiểm tra chủ điểm ngữ pháp. <data>{data}</data>";
        }
    }
}
