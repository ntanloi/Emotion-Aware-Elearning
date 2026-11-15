package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.AnswerOption;
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
public class Ai01_KeyPlausibilityRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled() || ctx.getQuestions() == null || ctx.getQuestions().isEmpty()) {
            return issues;
        }

        ensurePromptLoaded();

        // Lấy ngưỡng tự tin từ cấu hình policy (mặc định 0.75)
        double confidenceMin = 0.75;
        JsonNode policy = ctx.getPolicy();
        if (policy != null && policy.has("llm") && policy.path("llm").has("confidenceMin")) {
            confidenceMin = policy.path("llm").path("confidenceMin").asDouble(0.75);
        }

        // Giới hạn số câu hỏi chạy LLM để tối ưu chi phí và thời gian (tối đa 10 câu đầu hoặc câu Part 5/6/7)
        int checkedCount = 0;
        for (Question q : ctx.getQuestions()) {
            if (checkedCount >= 10) break;

            List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
            if (options.size() < 3) continue;

            AnswerOption correctOpt = options.stream().filter(AnswerOption::isCorrect).findFirst().orElse(null);
            if (correctOpt == null) continue;

            checkedCount++;

            // Chạy 2 lần với thứ tự lựa chọn đảo để chống ảo giác (SPEC mục 8)
            Map<String, Object> data1 = buildQuestionData(q, options, correctOpt.getLabel(), false);
            Map<String, Object> data2 = buildQuestionData(q, options, correctOpt.getLabel(), true);

            String json1 = toJson(data1);
            String json2 = toJson(data2);
            String contentHash = ctx.getCourse().getId() + ":" + q.getId();

            LlmAnalysisResponse res1 = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json1, contentHash + ":fwd");
            LlmAnalysisResponse res2 = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json2, contentHash + ":rev");

            if (!res1.isSuccess() || !res2.isSuccess()) {
                continue;
            }

            try {
                JsonNode r1 = objectMapper.readTree(res1.getRawJson());
                JsonNode r2 = objectMapper.readTree(res2.getRawJson());

                boolean ok1 = r1.path("key_ok").asBoolean(true);
                boolean ok2 = r2.path("key_ok").asBoolean(true);
                double conf1 = r1.path("confidence").asDouble(0.0);
                double conf2 = r2.path("confidence").asDouble(0.0);
                String pred1 = r1.path("pred").asText();
                String pred2 = r2.path("pred").asText();

                // Chỉ báo lỗi khi CẢ HAI LẦN cùng bất đồng với đáp án của giảng viên và độ tin cậy >= confidenceMin
                if (!ok1 && !ok2 && conf1 >= confidenceMin && conf2 >= confidenceMin && pred1.equalsIgnoreCase(pred2)) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Nghi vấn đáp án câu hỏi không chính xác. Giảng viên chọn '%s', nhưng mô hình AI độc lập đề xuất đáp án đúng là '%s' (Độ tin cậy: %.0f%%). Lý do: %s",
                                    correctOpt.getLabel(), pred1, Math.min(conf1, conf2) * 100, r1.path("reason").asText()))
                            .suggestion("Kiểm tra lại đáp án đúng và lời giải chi tiết của câu hỏi.")
                            .confidence((float) Math.min(conf1, conf2))
                            .model(llmClient.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-01: {}", ex.getMessage());
            }
        }

        return issues;
    }

    private Map<String, Object> buildQuestionData(Question q, List<AnswerOption> options, String currentKey, boolean reverse) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("prompt", q.getPromptText());
        data.put("current_key", currentKey);

        List<AnswerOption> copy = new ArrayList<>(options);
        if (reverse) {
            Collections.reverse(copy);
        }

        Map<String, String> opts = new LinkedHashMap<>();
        for (AnswerOption o : copy) {
            opts.put(o.getLabel(), o.getContent());
        }
        data.put("options", opts);
        return data;
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
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai01_key_plausibility.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
            }
        } catch (Exception e) {
            promptTemplate = "Kiểm tra đáp án câu hỏi. <data>{data}</data>";
        }
    }
}
