package com.elearning.emotion.moderation.rule.txt;

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
public class Txt11_LanguageToolSpellingRule implements ModerationRule {

    private final LanguageToolClient languageToolClient;

    @Override
    public String id() { return "TXT-11"; }

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
            String prompt = q.getPromptText();
            String expl = q.getExplanation();

            List<LanguageToolMatchDto> totalMatches = new ArrayList<>();

            if (prompt != null && prompt.trim().length() >= 15 && isEnglishText(prompt)) {
                totalMatches.addAll(languageToolClient.checkText(prompt, "en-US"));
            }
            if (expl != null && expl.trim().length() >= 15 && isEnglishText(expl)) {
                totalMatches.addAll(languageToolClient.checkText(expl, "en-US"));
            }

            // SPEC mục 7.8 (TXT-11): "chỉ báo khi >= 2 lỗi trong một câu hỏi hoặc có lỗi nặng"
            boolean hasSevere = totalMatches.stream().anyMatch(m ->
                    "grammar".equalsIgnoreCase(m.getIssueType()) || m.getRuleId().contains("AGREEMENT")
            );

            if (totalMatches.size() >= 2 || hasSevere) {
                LanguageToolMatchDto first = totalMatches.get(0);
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("QUESTION")
                        .targetId(q.getId())
                        .message(String.format("Phát hiện %d nghi vấn lỗi chính tả/ngữ pháp tiếng Anh trong câu hỏi (ví dụ: %s).",
                                totalMatches.size(), first.getMessage()))
                        .suggestion(first.getReplacements() != null && !first.getReplacements().isEmpty()
                                ? "Gợi ý: " + String.join(", ", first.getReplacements())
                                : "Rà soát lại chính tả và ngữ pháp đề câu hỏi.")
                        .confidence(0.85f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }

    private boolean isEnglishText(String text) {
        // Kiểm tra xem đoạn văn có phải tiếng Anh không (nếu có dấu tiếng Việt thì bỏ qua)
        return !text.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*");
    }
}
