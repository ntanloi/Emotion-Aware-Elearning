package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Voc02_PartOfSpeechRule implements ModerationRule {

    private static final Set<String> VALID_POS = new HashSet<>(Arrays.asList(
            "n", "v", "adj", "adv", "prep", "conj", "pron", "det", "interj", "phr",
            "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "determiner", "interjection", "phrase"
    ));

    @Override
    public String id() { return "VOC-02"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            String pos = vw.getPartOfSpeech();
            if (pos == null || pos.trim().isBlank() || !VALID_POS.contains(pos.trim().toLowerCase())) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Từ loại '%s' của từ '%s' không hợp lệ.",
                                pos != null ? pos : "(để trống)", vw.getWord() != null ? vw.getWord() : ""))
                        .suggestion("Chọn một trong các từ loại chuẩn: n, v, adj, adv, prep, conj, pron, phr.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
