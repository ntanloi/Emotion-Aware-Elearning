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
public class Ai02_AmbiguityRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-02"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled() || ctx.getQuestions() == null || ctx.getQuestions().isEmpty()) {
            return issues;
        }

        ensurePromptLoaded();

        int checkedCount = 0;
        for (Question q : ctx.getQuestions()) {
            if (checkedCount >= 10) break;

            List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
            if (options.size() < 3) continue;

            checkedCount++;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("prompt", q.getPromptText());
            Map<String, String> opts = new LinkedHashMap<>();
            for (AnswerOption o : options) {
                opts.put(o.getLabel(), o.getContent());
            }
            data.put("options", opts);

            String json = toJson(data);
            String contentHash = ctx.getCourse().getId() + ":ambiguity:" + q.getId();

            LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
            if (!res.isSuccess()) continue;

            try {
                JsonNode root = objectMapper.readTree(res.getRawJson());
                boolean isAmbiguous = root.path("ambiguous").asBoolean(false);
                JsonNode optionsOk = root.path("options_ok");

                if (isAmbiguous && optionsOk.isArray() && optionsOk.size() > 1) {
                    List<String> validOpts = new ArrayList<>();
                    optionsOk.forEach(o -> validOpts.add(o.asText()));

                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Câu hỏi có dấu hiệu mơ hồ hoặc có nhiều đáp án cùng đúng (%s). Lý do: %s",
                                    String.join(", ", validOpts), root.path("reason").asText()))
                            .suggestion("Bổ sung ngữ cảnh cho đề bài hoặc chỉnh sửa các phương án nhiễu để đảm bảo chỉ có duy nhất 1 đáp án đúng.")
                            .confidence(0.85f)
                            .model(llmClient.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-02: {}", ex.getMessage());
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
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai02_ambiguity.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
            }
        } catch (Exception e) {
            promptTemplate = "Kiểm tra tính mơ hồ của câu hỏi. <data>{data}</data>";
        }
    }
}
