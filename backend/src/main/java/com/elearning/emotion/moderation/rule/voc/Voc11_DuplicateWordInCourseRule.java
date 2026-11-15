package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Voc11_DuplicateWordInCourseRule implements ModerationRule {

    @Override
    public String id() { return "VOC-11"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.INFO; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        Map<String, String> wordFirstSeenSet = new HashMap<>();

        for (ContentItem item : ctx.getItems()) {
            if (!"VOCAB_SET".equalsIgnoreCase(item.getType())) continue;

            List<VocabWord> words = ctx.getItemVocabWords(item.getId());
            for (VocabWord vw : words) {
                if (vw.getWord() == null) continue;
                String cleanWord = vw.getWord().trim().toLowerCase();

                if (wordFirstSeenSet.containsKey(cleanWord)) {
                    String priorSet = wordFirstSeenSet.get(cleanWord);
                    if (!priorSet.equals(item.getTitle())) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("VOCAB_WORD")
                                .targetId(vw.getId())
                                .message(String.format("Từ '%s' đã xuất hiện ở bộ từ vựng khác ('%s') trong cùng khóa học.",
                                        vw.getWord(), priorSet))
                                .suggestion("Xem xét nếu muốn phân bổ từ vựng theo chủ đề riêng biệt.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                } else {
                    wordFirstSeenSet.put(cleanWord, item.getTitle() != null ? item.getTitle() : "Bộ từ vựng");
                }
            }
        }

        return issues;
    }
}
