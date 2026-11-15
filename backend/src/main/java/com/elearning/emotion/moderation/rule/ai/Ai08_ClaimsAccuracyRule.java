package com.elearning.emotion.moderation.rule.ai;

import com.elearning.emotion.entity.ContentItem;
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
public class Ai08_ClaimsAccuracyRule implements ModerationRule {

    private final ModerationLlmClient llmClient;
    private final ObjectMapper objectMapper;

    private static final String PROMPT_VERSION = "v1.0";
    private String promptTemplate = "";

    @Override
    public String id() { return "AI-08"; }

    @Override
    public String category() { return "ACCURACY"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (!llmClient.isEnabled()) {
            return issues;
        }

        String desc = ctx.getCourse().getDescription();
        if (desc == null || desc.trim().length() < 30) {
            return issues; // Mô tả quá ngắn, không có tuyên bố số lượng để đối chiếu
        }

        ensurePromptLoaded();

        // Tính sẵn số liệu thực tế bằng code (chống ảo giác thống kê)
        int totalQuestions = ctx.getQuestions() != null ? ctx.getQuestions().size() : 0;
        Map<String, Integer> partBreakdown = new LinkedHashMap<>();
        if (ctx.getQuestions() != null) {
            for (Question q : ctx.getQuestions()) {
                String p = q.getToeicPart() != null ? q.getToeicPart().name() : "UNKNOWN";
                partBreakdown.put(p, partBreakdown.getOrDefault(p, 0) + 1);
            }
        }

        int totalVocab = ctx.getVocabWords() != null ? ctx.getVocabWords().size() : 0;
        int totalGrammar = 0;
        if (ctx.getContentItems() != null) {
            for (ContentItem it : ctx.getContentItems()) {
                if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                    totalGrammar++;
                }
            }
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total_questions", totalQuestions);
        stats.put("part_breakdown", partBreakdown);
        stats.put("total_vocab_words", totalVocab);
        stats.put("total_grammar_topics", totalGrammar);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("course_title", ctx.getCourse().getTitle());
        data.put("course_description", desc);
        data.put("statistics", stats);

        String json = toJson(data);
        String contentHash = ctx.getCourse().getId() + ":claims";

        LlmAnalysisResponse res = llmClient.callLlm(id(), PROMPT_VERSION, promptTemplate, json, contentHash);
        if (!res.isSuccess()) return issues;

        try {
            JsonNode root = objectMapper.readTree(res.getRawJson());
            JsonNode mismatches = root.path("claims_mismatch");

            if (mismatches.isArray()) {
                for (JsonNode m : mismatches) {
                    String claim = m.path("claim").asText("");
                    String evidence = m.path("evidence").asText("");
                    String why = m.path("why").asText("");

                    if (claim == null || claim.isBlank()) continue;

                    // Rào chắn chống ảo giác: claim phải tồn tại trong mô tả thật
                    if (!desc.toLowerCase().contains(claim.trim().toLowerCase())) {
                        log.info("AI-08: Bỏ qua tuyên bố '{}' do không tìm thấy trong mô tả thực tế của khóa học.", claim);
                        continue;
                    }

                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .source("LLM")
                            .targetType("COURSE")
                            .targetId(ctx.getCourse().getId())
                            .message(String.format("Tuyên bố trong mô tả khóa học có dấu hiệu không khớp với số liệu nội dung: \"%s\".", claim))
                            .suggestion(why != null && !why.isBlank() ? why : "Điều chỉnh lại mô tả khóa học cho chính xác với số liệu thực tế.")
                            .evidence(evidence)
                            .confidence(0.85f)
                            .model(res.getModel())
                            .promptVersion(PROMPT_VERSION)
                            .build());
                }
            }
        } catch (Exception ex) {
            log.warn("Lỗi phân tích JSON kết quả AI-08: {}", ex.getMessage());
        }

        return issues;
    }

    private synchronized void ensurePromptLoaded() {
        if (!promptTemplate.isEmpty()) return;
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/ai08_claims_accuracy.txt");
            try (InputStream is = res.getInputStream()) {
                promptTemplate = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Không thể tải prompt ai08_claims_accuracy.txt: {}", e.getMessage());
            promptTemplate = "Nhiệm vụ: AI-08. Dữ liệu: <data>{data}</data>";
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
