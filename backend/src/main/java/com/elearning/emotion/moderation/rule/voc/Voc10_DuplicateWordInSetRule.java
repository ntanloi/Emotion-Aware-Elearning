package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class Voc10_DuplicateWordInSetRule implements ModerationRule {

    @Override
    public String id() { return "VOC-10"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        for (ContentItem item : ctx.getItems()) {
            if (!"VOCAB_SET".equalsIgnoreCase(item.getType())) continue;

            List<VocabWord> words = ctx.getItemVocabWords(item.getId());
            Set<String> seen = new HashSet<>();

            for (VocabWord vw : words) {
                if (vw.getWord() == null) continue;
                String key = vw.getWord().trim().toLowerCase() + "#" +
                        (vw.getPartOfSpeech() != null ? vw.getPartOfSpeech().trim().toLowerCase() : "");

                if (seen.contains(key)) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Từ vựng '%s' (%s) bị trùng lặp trong cùng một bộ từ vựng '%s'.",
                                    vw.getWord(), vw.getPartOfSpeech() != null ? vw.getPartOfSpeech() : "", item.getTitle()))
                            .suggestion("Xóa hoặc thay thế từ vựng trùng lặp để danh sách từ vựng đa dạng hơn.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    seen.add(key);
                }
            }
        }

        return issues;
    }
}
