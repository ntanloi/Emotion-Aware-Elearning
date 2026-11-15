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
import java.util.regex.Pattern;

@Component
public class Dic03_EnglishTextRule implements ModerationRule {

    private static final Pattern VALID_EN_TEXT = Pattern.compile("^[a-zA-Z0-9\\s.,!?'\"\\-:;()$%/]+$");

    @Override
    public String id() { return "DIC-03"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> dictationItems = ctx.getSectionItems("DICTATION");
        if (dictationItems.isEmpty()) return issues;

        for (ContentItem it : dictationItems) {
            List<Question> questions = ctx.getItemQuestions(it.getId());
            for (Question q : questions) {
                String prompt = q.getPromptText();
                if (prompt != null && !prompt.isBlank()) {
                    if (!VALID_EN_TEXT.matcher(prompt.trim()).matches()) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu chính tả '%s' chứa ký tự lạ hoặc ngôn ngữ không phải tiếng Anh chuẩn.",
                                        prompt.trim().substring(0, Math.min(40, prompt.trim().length()))))
                                .suggestion("Đảm bảo câu luyện chép chính tả là câu tiếng Anh chuẩn, không lẫn ký tự lỗi font.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
