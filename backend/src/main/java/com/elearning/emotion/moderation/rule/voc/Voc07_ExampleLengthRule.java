package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabExample;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Voc07_ExampleLengthRule implements ModerationRule {

    @Override
    public String id() { return "VOC-07"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minWords = 4;
        int maxWords = 35;
        if (policy != null && policy.has("sections") && policy.path("sections").has("VOCAB")) {
            JsonNode ew = policy.path("sections").path("VOCAB").path("exampleWords");
            if (ew.isArray() && ew.size() >= 2) {
                minWords = ew.get(0).asInt(4);
                maxWords = ew.get(1).asInt(35);
            }
        }

        for (VocabWord vw : ctx.getVocabWords()) {
            List<VocabExample> examples = ctx.getWordExamples(vw.getId());
            for (VocabExample ve : examples) {
                String en = ve.getSentenceEn();
                if (en == null || en.isBlank()) continue;

                String[] words = en.trim().split("\\s+");
                if (words.length < minWords || words.length > maxWords) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Câu ví dụ tiếng Anh của từ '%s' có %d từ (khoảng chuẩn là %d–%d từ).",
                                    vw.getWord(), words.length, minWords, maxWords))
                            .suggestion("Viết câu ví dụ có độ dài vừa phải để học viên dễ hiểu và dễ nhớ.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
