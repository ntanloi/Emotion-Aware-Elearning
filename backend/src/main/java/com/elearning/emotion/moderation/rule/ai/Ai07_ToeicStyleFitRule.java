package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.Question;
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
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class Ai07_ToeicStyleFitRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-07"; }

    @Override
    public String category() { return "STYLE"; }

    @Override
    public Severity defaultSeverity() { return Severity.INFO; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled() || ctx.getQuestions() == null || ctx.getQuestions().isEmpty()) {
            return issues;
        }

        ensurePromptLoaded();

        // Lấy mẫu tối đa 5 câu hỏi để đánh giá văn phong chung
        int sampleCount = 0;
        for (Question q : ctx.getQuestions()) {
            if (sampleCount >= 5) break;
            if (q.getContent() == null || q.getContent().length() < 20) continue;

            sampleCount++;
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("question_id", q.getId());
            data.put("question_text", q.getContent());

            String json = toJson(data);
            String contentHash = ctx.getCourse().getId() + ":style:" + q.getId();

            LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
            if (!res.isSuccess()) continue;

            try {
                JsonNode root = objectMapper.readTree(res.getRawJson());
                boolean fit = root.path("fit").asBoolean(true);
                String note = root.path("note").asText("");

                if (!fit) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Văn phong câu hỏi có thể chưa hoàn toàn chuẩn mực theo phong cách công sở / kinh doanh của bài thi TOEIC.")
                            .suggestion(note != null && !note.isBlank() ? note : "Tham khảo ngữ cảnh làm việc quốc tế của đề thi TOEIC chuẩn.")
                            .confidence(0.7f)
                            .model(res.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-07: {}", ex.getMessage());
            }
        }

        return issues;
    }

    private synchronized void ensurePromptLoaded() {
        if (!promptTemplate.isEmpty()) return;
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai07_style_fit.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Không thể tải prompt ai07_style_fit.txt: {}", e.getMessage());
            promptTemplate = "Nhiệm vụ: AI-07. Dữ liệu: <data>{data}</data>";
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
