package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Cm10_PromptNonEmptyRule implements ModerationRule {

    @Override
    public String id() { return "CM-10"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        for (Question q : ctx.getQuestions()) {
            String prompt = q.getPromptText();
            String sec = q.getContentItem() != null && q.getContentItem().getSectionCode() != null
                    ? q.getContentItem().getSectionCode().toUpperCase() : "";

            boolean audioOnlyAllowed = ("PART1".equals(sec) || "PART2".equals(sec))
                    && (q.getAudio() != null || (q.getPassage() != null && q.getPassage().getAudio() != null));

            if ((prompt == null || prompt.trim().isBlank()) && !audioOnlyAllowed) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("QUESTION")
                        .targetId(q.getId())
                        .message("Nội dung câu hỏi (prompt) để trống.")
                        .suggestion("Điền nội dung câu hỏi hoặc tải file âm thanh nếu là câu hỏi nghe Part 1/Part 2.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
