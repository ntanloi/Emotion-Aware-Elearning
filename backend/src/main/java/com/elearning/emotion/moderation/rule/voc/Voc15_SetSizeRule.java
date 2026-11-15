package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.ContentItem;
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
public class Voc15_SetSizeRule implements ModerationRule {

    @Override
    public String id() { return "VOC-15"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minSet = 10;
        int maxSet = 40;
        if (policy != null && policy.has("sections") && policy.path("sections").has("VOCAB")) {
            JsonNode ss = policy.path("sections").path("VOCAB").path("setSize");
            if (ss.isArray() && ss.size() >= 2) {
                minSet = ss.get(0).asInt(10);
                maxSet = ss.get(1).asInt(40);
            }
        }

        for (ContentItem item : ctx.getItems()) {
            if ("VOCAB_SET".equalsIgnoreCase(item.getType())) {
                List<VocabWord> words = ctx.getItemVocabWords(item.getId());
                if (words.size() < minSet || words.size() > maxSet) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bộ từ vựng '%s' có %d từ (khoảng chuẩn khuyến nghị là %d–%d từ/bộ).",
                                    item.getTitle(), words.size(), minSet, maxSet))
                            .suggestion("Chia nhỏ hoặc gom các bộ từ để học viên tiếp thu tối ưu mỗi phiên học.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
