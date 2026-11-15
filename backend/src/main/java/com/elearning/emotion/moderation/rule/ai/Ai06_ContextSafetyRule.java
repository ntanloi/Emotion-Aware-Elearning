package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.client.LlmAnalysisResponse;
import com.elearning.emotion.moderation.client.ModerationLlmClient;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.LexiconService;
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
public class Ai06_ContextSafetyRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final LexiconService lexiconService;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-06"; }

    @Override
    public String category() { return "SAFETY"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled()) {
            return issues;
        }

        ensurePromptLoaded();

        // 1. Kiểm tra mô tả khóa học
        String desc = ctx.getCourse().getDescription();
        if (desc != null && !desc.isBlank()) {
            checkTextForContextViolations(desc, "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", ctx, issues);
        }

        // 2. Kiểm tra bài giảng (ContentItem)
        if (ctx.getContentItems() != null) {
            for (ContentItem it : ctx.getContentItems()) {
                if (it.getBodyHtml() != null && !it.getBodyHtml().isBlank()) {
                    String plain = Jsoup.parse(it.getBodyHtml()).text();
                    checkTextForContextViolations(plain, "ITEM", it.getId(), "Bài học '" + it.getTitle() + "'", ctx, issues);
                }
            }
        }

        // 3. Kiểm tra câu hỏi
        if (ctx.getQuestions() != null) {
            int qChecked = 0;
            for (Question q : ctx.getQuestions()) {
                if (qChecked >= 10) break;
                if (q.getContent() != null && !q.getContent().isBlank()) {
                    qChecked++;
                    checkTextForContextViolations(q.getContent(), "QUESTION", q.getId(), "Câu hỏi", ctx, issues);
                }
            }
        }

        return issues;
    }

    private void checkTextForContextViolations(String text, String targetType, String targetId, String label,
                                               ModerationContext ctx, List<RuleIssue> issues) {
        // Quét danh sách từ khóa mức CONTEXT
        List<LexiconService.LexiconMatch> matches = lexiconService.scan(text, "ALL", true);
        boolean hasContextMatch = matches.stream().anyMatch(m -> "CONTEXT".equalsIgnoreCase(m.getSeverity()));
        if (!hasContextMatch) {
            return;
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("context_label", label);
        data.put("text", text.length() > 2500 ? text.substring(0, 2500) : text);

        String json = toJson(data);
        String contentHash = ctx.getCourse().getId() + ":safety:" + targetType + ":" + targetId;

        LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
        if (!res.isSuccess()) return;

        try {
            JsonNode root = objectMapper.readTree(res.getRawJson());
            String cat = root.path("category").asText("SAFE").toUpperCase();
            if ("SAFE".equalsIgnoreCase(cat)) {
                return;
            }

            String quote = root.path("quote").asText("");
            String reason = root.path("reason").asText("");
            String sevStr = root.path("severity").asText("WARNING").toUpperCase();

            // Rào chắn chống ảo giác: trích dẫn quote PHẢI có thật trong văn bản nguồn
            if (quote == null || quote.isBlank() || !text.toLowerCase().contains(quote.trim().toLowerCase())) {
                log.info("AI-06: Bỏ qua cảnh báo LLM vì đoạn trích dẫn '{}' không tìm thấy trong văn bản gốc (chống ảo giác).", quote);
                return;
            }

            Severity sev;
            try {
                sev = Severity.valueOf(sevStr);
            } catch (Exception ex) {
                sev = Severity.WARNING;
            }

            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(sev)
                    .source("LLM")
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("Phát hiện nội dung có dấu hiệu xúc phạm hoặc không an toàn trong %s: \"%s\".", label, quote))
                    .suggestion(reason != null && !reason.isBlank() ? reason : "Xem xét điều chỉnh hoặc loại bỏ nội dung nhạy cảm.")
                    .evidence(quote)
                    .confidence(0.85f)
                    .model(res.getModel())
                    .promptVersion(PROMPT_VERSION)
                    .build());
        } catch (Exception ex) {
            log.warn("Lỗi xử lý phản hồi từ AI-06: {}", ex.getMessage());
        }
    }

    private synchronized void ensurePromptLoaded() {
        if (!promptTemplate.isEmpty()) return;
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai06_context_safety.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Không thể tải prompt ai06_context_safety.txt: {}", e.getMessage());
            promptTemplate = "Nhiệm vụ: AI-06. Dữ liệu: <data>{data}</data>";
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
