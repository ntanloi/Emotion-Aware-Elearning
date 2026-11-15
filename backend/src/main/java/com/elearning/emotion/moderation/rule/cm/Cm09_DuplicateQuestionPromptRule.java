package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Cm09_DuplicateQuestionPromptRule implements ModerationRule {

    @Override
    public String id() { return "CM-09"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        Map<String, Question> seenPrompts = new HashMap<>();

        for (Question q : ctx.getQuestions()) {
            String prompt = q.getPromptText();
            if (prompt == null || prompt.trim().length() <= 15) continue;

            String norm = TextNormalizer.normalizeBase(prompt);
            if (seenPrompts.containsKey(norm)) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("QUESTION")
                        .targetId(q.getId())
                        .message(String.format("Câu hỏi này bị trùng lặp hoàn toàn nội dung đề với một câu hỏi khác trong khóa học: '%s'.",
                                prompt.trim().substring(0, Math.min(60, prompt.trim().length()))))
                        .suggestion("Thay đổi nội dung hoặc xóa câu hỏi trùng lặp để tránh giảm chất lượng đề thi.")
                        .confidence(0.98f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            } else {
                seenPrompts.put(norm, q);
            }
        }

        return issues;
    }
}
