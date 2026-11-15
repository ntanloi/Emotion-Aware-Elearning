package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabExample;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Voc05_ExampleSentenceRule implements ModerationRule {

    @Override
    public String id() { return "VOC-05"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            List<VocabExample> examples = ctx.getWordExamples(vw.getId());
            boolean hasValidExample = false;

            for (VocabExample ve : examples) {
                if (ve.getSentenceEn() != null && !ve.getSentenceEn().trim().isBlank()
                        && ve.getSentenceVi() != null && !ve.getSentenceVi().trim().isBlank()) {
                    hasValidExample = true;
                    break;
                }
            }

            if (!hasValidExample) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Từ vựng '%s' chưa có câu ví dụ tiếng Anh kèm bản dịch tiếng Việt.",
                                vw.getWord() != null ? vw.getWord() : ""))
                        .suggestion("Thêm ít nhất 1 câu ví dụ minh họa ngữ cảnh sử dụng và dịch sang tiếng Việt.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
