package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Cm07_ExplanationCoverageRule implements ModerationRule {

    @Override
    public String id() { return "CM-07"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minChars = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("explanationMinChars").asInt(15) : 15;
        int minCoveragePct = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("explanationCoveragePct").asInt(90) : 90;

        for (ContentItem item : ctx.getItems()) {
            if (!"PRACTICE_TEST".equalsIgnoreCase(item.getType())) continue;

            List<Question> questions = ctx.getItemQuestions(item.getId());
            if (questions.isEmpty()) continue;

            int withExplanation = 0;
            for (Question q : questions) {
                String exp = q.getExplanation();
                if (exp != null && !exp.trim().isBlank()) {
                    withExplanation++;
                    if (exp.trim().length() < minChars) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Lời giải thích của câu hỏi quá ngắn (dưới %d ký tự).", minChars))
                                .suggestion("Viết giải thích chi tiết lý do chọn đáp án và phân tích các bẫy thường gặp.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }

            int coveragePct = (withExplanation * 100) / questions.size();
            if (coveragePct < minCoveragePct) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("ITEM")
                        .targetId(item.getId())
                        .message(String.format("Bài tập '%s' chỉ có %d%% câu hỏi có lời giải thích (tiêu chuẩn khuyến nghị ≥ %d%%).",
                                item.getTitle(), coveragePct, minCoveragePct))
                        .suggestion("Bổ sung giải thích cho các câu hỏi còn lại để học viên nắm vững kiến thức.")
                        .confidence(0.9f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
