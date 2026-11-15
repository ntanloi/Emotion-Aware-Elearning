package com.elearning.emotion.moderation.rule.dic;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Dic01_AudioRequiredRule implements ModerationRule {

    @Override
    public String id() { return "DIC-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> dictationItems = ctx.getSectionItems("DICTATION");
        if (dictationItems.isEmpty()) return issues;

        for (ContentItem it : dictationItems) {
            List<Question> questions = ctx.getItemQuestions(it.getId());
            for (Question q : questions) {
                boolean hasAudio = q.getAudio() != null || (q.getPassage() != null && q.getPassage().getAudio() != null);
                if (!hasAudio) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi luyện nghe chép chính tả (Dictation) thiếu file âm thanh Audio.")
                            .suggestion("Tải file audio phát âm câu để học viên nghe và gõ lại.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
