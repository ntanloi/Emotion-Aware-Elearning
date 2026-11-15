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
public class Cm01_SingleCorrectAnswerRule implements ModerationRule {

    @Override
    public String id() { return "CM-01"; }

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
                long correctCount = options.stream().filter(o -> Boolean.TRUE.equals(o.getIsCorrect())).count();

                if (correctCount == 0) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi trắc nghiệm chưa được đánh dấu đáp án đúng.")
                            .suggestion("Đánh dấu chính xác 1 lựa chọn làm đáp án đúng (isCorrect = true).")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else if (correctCount > 1) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi trắc nghiệm đơn nhưng có " + correctCount + " đáp án được đánh dấu đúng.")
                            .suggestion("Chỉ chọn duy nhất 1 đáp án chính xác cho câu hỏi trắc nghiệm.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
