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
public class Cm02_SequentialOptionLabelsRule implements ModerationRule {

    @Override
    public String id() { return "CM-02"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        for (Question q : ctx.getQuestions()) {
            if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                String sec = q.getContentItem() != null && q.getContentItem().getSectionCode() != null
                        ? q.getContentItem().getSectionCode().toUpperCase() : "";

                int expectedCount = "PART2".equals(sec) ? 3 : 4;
                char expectedChar = 'A';
                boolean validSequence = options.size() == expectedCount;

                if (validSequence) {
                    for (int i = 0; i < options.size(); i++) {
                        String label = options.get(i).getLabel();
                        String expectedLabel = String.valueOf((char) (expectedChar + i));
                        if (label == null || !expectedLabel.equalsIgnoreCase(label.trim())) {
                            validSequence = false;
                            break;
                        }
                    }
                }

                if (!validSequence) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Các nhãn lựa chọn phải là các chữ cái liên tục %s (hiện có %d lựa chọn).",
                                    expectedCount == 3 ? "A–C" : "A–D", options.size()))
                            .suggestion("Kiểm tra lại nhãn (label) và số lượng đáp án của câu hỏi.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
