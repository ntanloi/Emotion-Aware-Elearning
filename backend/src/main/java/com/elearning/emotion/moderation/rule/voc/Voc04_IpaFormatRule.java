package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Voc04_IpaFormatRule implements ModerationRule {

    @Override
    public String id() { return "VOC-04"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            String ipa = vw.getIpa();
            if (ipa != null && !ipa.trim().isBlank()) {
                String trimmed = ipa.trim();
                boolean validFormat = (trimmed.startsWith("/") && trimmed.endsWith("/"))
                        || (trimmed.startsWith("[") && trimmed.endsWith("]"));

                if (!validFormat) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Phiên âm IPA '%s' của từ '%s' không đúng định dạng chuẩn /.../ hoặc [...].",
                                    trimmed, vw.getWord() != null ? vw.getWord() : ""))
                            .suggestion("Bọc phiên âm quốc tế IPA trong dấu gạch chéo /.../, ví dụ: /kəmˈpjuːtə/.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
