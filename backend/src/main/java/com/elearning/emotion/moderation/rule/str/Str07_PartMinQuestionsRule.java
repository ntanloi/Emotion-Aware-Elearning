package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Str07_PartMinQuestionsRule implements ModerationRule {

    private static final Map<String, Integer> DEFAULT_MIN = Map.of(
            "PART1", 6,
            "PART2", 25,
            "PART3", 39,
            "PART4", 30,
            "PART5", 30,
            "PART6", 16,
            "PART7", 54
    );

    @Override
    public String id() { return "STR-07"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if ("EXAM".equalsIgnoreCase(ctx.getProfile())) {
            return Collections.emptyList();
        }

        List<RuleIssue> issues = new ArrayList<>();
        JsonNode policy = ctx.getPolicy();
        JsonNode sectionsNode = policy != null ? policy.path("sections") : null;

        for (Map.Entry<String, Integer> entry : DEFAULT_MIN.entrySet()) {
            String part = entry.getKey();
            int defaultMin = entry.getValue();

            if (ctx.isSectionOpened(part)) {
                int required = defaultMin;
                if (sectionsNode != null && sectionsNode.has(part)) {
                    required = sectionsNode.path(part).path("minQuestions").asInt(defaultMin);
                }

                List<ContentItem> items = ctx.getSectionItems(part);
                int activeQuestions = 0;
                for (ContentItem item : items) {
                    List<Question> qs = ctx.getItemQuestions(item.getId());
                    for (Question q : qs) {
                        if (q.getStatus() == null || !"DISABLED".equalsIgnoreCase(q.getStatus())) {
                            activeQuestions++;
                        }
                    }
                }

                if (activeQuestions < required) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("SECTION")
                            .targetId(part)
                            .message(String.format("Mục %s chưa đủ số câu hỏi tối thiểu (%d/%d câu hợp lệ).", part, activeQuestions, required))
                            .suggestion(String.format("Bổ sung thêm ít nhất %d câu hỏi cho mục %s.", required - activeQuestions, part))
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=" + part)
                            .build());
                }
            }
        }

        return issues;
    }
}
