package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.VocabWord;
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
public class Ai05_VocabMeaningAccuracyRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-05"; }

    @Override
    public String category() { return "VOCABULARY"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled() || ctx.getVocabWords() == null || ctx.getVocabWords().isEmpty()) {
            return issues;
        }

        ensurePromptLoaded();

        double confidenceMin = 0.75;
        JsonNode policy = ctx.getPolicy();
        if (policy != null && policy.has("llm") && policy.path("llm").has("confidenceMin")) {
            confidenceMin = policy.path("llm").path("confidenceMin").asDouble(0.75);
        }

        // Đánh giá tối đa 15 từ vựng đầu tiên để tối ưu thời gian phản hồi
        int checked = 0;
        for (VocabWord vw : ctx.getVocabWords()) {
            if (checked >= 15) break;
            if (vw.getWord() == null || vw.getMeaning() == null || vw.getMeaning().isBlank()) continue;

            checked++;
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("word", vw.getWord());
            data.put("part_of_speech", vw.getPartOfSpeech() != null ? vw.getPartOfSpeech() : "");
            data.put("meaning_vi", vw.getMeaning());

            String json = toJson(data);
            String contentHash = ctx.getCourse().getId() + ":vocab:" + vw.getId();

            LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
            if (!res.isSuccess()) continue;

            try {
                JsonNode root = objectMapper.readTree(res.getRawJson());
                boolean meaningOk = root.path("meaning_ok").asBoolean(true);
                double confidence = root.path("confidence").asDouble(0.0);
                String better = root.path("better").asText("");

                if (!meaningOk && confidence >= confidenceMin) {
                    String suggestionMsg = (better != null && !better.isBlank())
                            ? "Gợi ý nghĩa phù hợp hơn: " + better
                            : "Kiểm tra lại định nghĩa trong từ điển chuẩn.";

                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Nghĩa tiếng Việt '%s' của từ '%s' có dấu hiệu chưa chuẩn xác hoặc chưa đúng loại từ.",
                                    vw.getMeaning(), vw.getWord()))
                            .suggestion(suggestionMsg)
                            .confidence((float) confidence)
                            .model(res.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-05: {}", ex.getMessage());
            }
        }

        return issues;
    }

    private synchronized void ensurePromptLoaded() {
        if (!promptTemplate.isEmpty()) return;
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai05_vocab_meaning.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Không thể tải prompt ai05_vocab_meaning.txt: {}", e.getMessage());
            promptTemplate = "Nhiệm vụ: AI-05. Dữ liệu: <data>{data}</data>";
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
