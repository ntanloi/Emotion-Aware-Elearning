package com.elearning.emotion.moderation.rule.dic;

import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.client.LanguageToolClient;
import com.elearning.emotion.moderation.client.LanguageToolMatchDto;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Dic04_SentenceGrammarRule implements ModerationRule {

    private final LanguageToolClient languageToolClient;

    @Override
    public String id() { return "DIC-04"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null || ctx.getQuestions().isEmpty()) return issues;

        if (languageToolClient == null || !languageToolClient.isAvailable()) {
            return issues;
        }

        for (Question q : ctx.getQuestions()) {
            // Chỉ kiểm tra câu hỏi dạng DICTATION hoặc trong section DICTATION
            if ("DICTATION".equalsIgnoreCase(q.getKind()) || "DICTATION".equalsIgnoreCase(ctx.getItemSectionCode(q.getContentItem().getId()))) {
                String text = q.getPromptText();
                if (text == null || text.isBlank() || text.length() < 10) continue;

                List<LanguageToolMatchDto> matches = languageToolClient.checkText(text, "en-US");
                for (LanguageToolMatchDto m : matches) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Nghi vấn lỗi chính tả/ngữ pháp trong câu chép chính tả: %s (trong: \"%s\").",
                                    m.getMessage(), text))
                            .suggestion(m.getReplacements() != null && !m.getReplacements().isEmpty()
                                    ? "Gợi ý: " + String.join(", ", m.getReplacements())
                                    : "Rà soát lại câu tiếng Anh mẫu cho bài nghe chép chính tả.")
                            .confidence(0.90f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                    break; // Tối đa 1 issue mỗi câu chép
                }
            }
        }

        return issues;
    }
}
