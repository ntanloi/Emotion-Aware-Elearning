package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Cm08_ExplanationContradictionRule implements ModerationRule {

    private static final Pattern EXPLANATION_KEY_PATTERN = Pattern.compile(
            "(?i)\\b(?:chọn|đáp án|phương án|key|chọn đáp án)\\s*[:\\-\\s]*([A-D])\\b"
    );

    @Override
    public String id() { return "CM-08"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        for (Question q : ctx.getQuestions()) {
            if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                String exp = q.getExplanation();
                if (exp == null || exp.trim().isBlank()) continue;

                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                long correctCount = options.stream().filter(o -> Boolean.TRUE.equals(o.getIsCorrect())).count();
                if (correctCount != 1) continue;

                AnswerOption correctOpt = options.stream()
                        .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                        .findFirst().orElse(null);

                if (correctOpt != null && correctOpt.getLabel() != null) {
                    Matcher m = EXPLANATION_KEY_PATTERN.matcher(exp);
                    if (m.find()) {
                        String mentioned = m.group(1).toUpperCase();
                        String actual = correctOpt.getLabel().trim().toUpperCase();
                        if (!mentioned.equals(actual)) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("QUESTION")
                                    .targetId(q.getId())
                                    .message(String.format("Mâu thuẫn giữa lời giải thích và đáp án: Giải thích ghi '%s' nhưng hệ thống đang chọn đáp án %s.",
                                            m.group(0), actual))
                                    .suggestion(String.format("Kiểm tra lại xem đáp án đúng thực sự là %s hay %s.", mentioned, actual))
                                    .confidence(0.95f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                        }
                    }
                }
            }
        }

        return issues;
    }
}
