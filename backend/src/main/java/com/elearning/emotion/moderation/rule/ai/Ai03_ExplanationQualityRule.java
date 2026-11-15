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
public class Ai03_ExplanationQualityRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-03"; }

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
            String expl = q.getExplanation();
            if (expl == null || expl.trim().length() < 15) continue;
            if (checkedCount >= 10) break;

            List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
            AnswerOption correctOpt = options.stream().filter(AnswerOption::isCorrect).findFirst().orElse(null);
            if (correctOpt == null) continue;

            checkedCount++;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("prompt", q.getPromptText());
            data.put("correct_key", correctOpt.getLabel());
            data.put("correct_answer", correctOpt.getContent());
            data.put("explanation", expl);

            String json = toJson(data);
            String contentHash = ctx.getCourse().getId() + ":expl:" + q.getId();

            LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
            if (!res.isSuccess()) continue;

            try {
                JsonNode root = objectMapper.readTree(res.getRawJson());
                boolean isOk = root.path("explanation_ok").asBoolean(true);
                String issueMsg = root.path("issue").asText("");

                // SPEC: "Chỉ báo khi chỉ ra được câu sai cụ thể"
                if (!isOk && !issueMsg.isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Lời giải thích có điểm sai sót hoặc mâu thuẫn với đáp án: %s.", issueMsg))
                            .suggestion("Kiểm tra và sửa lại nội dung giải thích để học viên hiểu đúng bản chất câu hỏi.")
                            .confidence(0.85f)
                            .model(llmClient.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            } catch (Exception ex) {
                log.warn("Lỗi phân tích JSON kết quả AI-03: {}", ex.getMessage());
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
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai03_explanation.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
            }
        } catch (Exception e) {
            promptTemplate = "Kiểm tra chất lượng giải thích. <data>{data}</data>";
        }
    }
}
