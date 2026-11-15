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

@Component
public class Cm03_NonEmptyOptionContentRule implements ModerationRule {

    @Override
    public String id() { return "CM-03"; }

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
                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                for (AnswerOption opt : options) {
                    if (opt.getContent() == null || opt.getContent().trim().isBlank()) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Lựa chọn %s có nội dung để trống hoặc rỗng.",
                                        opt.getLabel() != null ? opt.getLabel() : ""))
                                .suggestion("Điền nội dung chi tiết cho phương án lựa chọn này.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
