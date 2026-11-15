package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class Str17_RecommendedQuantitiesRule implements ModerationRule {

    @Override
    public String id() { return "STR-17"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.INFO; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if ("EXAM".equalsIgnoreCase(ctx.getProfile())) {
            return Collections.emptyList();
        }

        List<RuleIssue> issues = new ArrayList<>();
        JsonNode policy = ctx.getPolicy();
        if (policy == null || !policy.has("sections")) return issues;
        JsonNode sectionsNode = policy.path("sections");

        for (String part : List.of("PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7")) {
            if (ctx.isSectionOpened(part) && sectionsNode.has(part)) {
                JsonNode pNode = sectionsNode.path(part);
                int rec = pNode.path("recQuestions").asInt(0);
                if (rec > 0) {
                    List<ContentItem> items = ctx.getSectionItems(part);
                    int activeQ = 0;
                    for (ContentItem item : items) {
                        for (Question q : ctx.getItemQuestions(item.getId())) {
                            if (q.getStatus() == null || !"DISABLED".equalsIgnoreCase(q.getStatus())) {
                                activeQ++;
                            }
                        }
                    }
                    if (activeQ < rec) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("SECTION")
                                .targetId(part)
                                .message(String.format("Mục %s có %d câu hỏi (mức khuyến nghị đạt chuẩn là %d câu để học viên ôn luyện tốt nhất).", part, activeQ, rec))
                                .suggestion("Bạn có thể bổ sung thêm câu hỏi để tăng giá trị chuyên sâu cho khóa học.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=" + part)
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
