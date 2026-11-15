package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class Cm11_ForbiddenOptionPhrasesRule implements ModerationRule {

    private static final List<String> DEFAULT_FORBIDDEN = Arrays.asList(
            "all of the above", "none of the above", "both a and b", "a and b", "b and c",
            "tất cả các đáp án", "không có đáp án nào", "cả a và b"
    );

    @Override
    public String id() { return "CM-11"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        List<String> forbidden = new ArrayList<>(DEFAULT_FORBIDDEN);
        if (policy != null && policy.has("thresholds") && policy.path("thresholds").has("forbiddenOptionPhrases")) {
            JsonNode arr = policy.path("thresholds").path("forbiddenOptionPhrases");
            if (arr.isArray()) {
                forbidden.clear();
                arr.forEach(node -> forbidden.add(node.asText().toLowerCase().trim()));
            }
        }

        for (Question q : ctx.getQuestions()) {
            if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                for (AnswerOption opt : options) {
                    if (opt.getContent() == null || opt.getContent().trim().isBlank()) continue;
                    String norm = TextNormalizer.normalizeBase(opt.getContent());
                    for (String phr : forbidden) {
                        if (norm.contains(phr)) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("QUESTION")
                                    .targetId(q.getId())
                                    .message(String.format("Lựa chọn %s chứa cụm từ không chuẩn format TOEIC: '%s'.",
                                            opt.getLabel() != null ? opt.getLabel() : "", phr))
                                    .suggestion("Đề thi TOEIC chuẩn không sử dụng các đáp án như 'All of the above' hay 'None of the above'.")
                                    .confidence(0.95f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                            break;
                        }
                    }
                }
            }
        }

        return issues;
    }
}
