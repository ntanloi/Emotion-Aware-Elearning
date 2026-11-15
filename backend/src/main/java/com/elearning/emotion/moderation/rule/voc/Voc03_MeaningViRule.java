package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class Voc03_MeaningViRule implements ModerationRule {

    private static final Pattern VIETNAMESE_DIACRITICS = Pattern.compile(
            "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", Pattern.CASE_INSENSITIVE
    );

    @Override
    public String id() { return "VOC-03"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            String meaning = vw.getMeaningVi();
            String word = vw.getWord();

            if (meaning == null || meaning.trim().isBlank()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Nghĩa tiếng Việt của từ '%s' bị để trống.", word != null ? word : ""))
                        .suggestion("Bổ sung bản dịch nghĩa tiếng Việt chính xác và dễ hiểu.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            } else if (word != null && meaning.trim().equalsIgnoreCase(word.trim())) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Nghĩa tiếng Việt trùng hệt với từ tiếng Anh ('%s').", word))
                        .suggestion("Dịch từ tiếng Anh sang nghĩa tiếng Việt chuẩn xác.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            } else if (!VIETNAMESE_DIACRITICS.matcher(meaning).find() && meaning.trim().length() > 5) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category("LANGUAGE")
                        .severity(Severity.WARNING)
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Nghĩa tiếng Việt của từ '%s' dường như là tiếng Việt không dấu: '%s'.", word, meaning))
                        .suggestion("Viết nghĩa tiếng Việt có dấu đầy đủ và đúng chính tả.")
                        .confidence(0.85f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
