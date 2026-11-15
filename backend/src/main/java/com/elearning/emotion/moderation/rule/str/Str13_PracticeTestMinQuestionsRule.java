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
public class Str13_PracticeTestMinQuestionsRule implements ModerationRule {

    @Override
    public String id() { return "STR-13"; }

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
        int minQuestions = policy != null && policy.has("practiceTest") ? policy.path("practiceTest").path("minQuestions").asInt(3) : 3;

        if (ctx.getItems() == null) return issues;

        for (ContentItem item : ctx.getItems()) {
            if ("PRACTICE_TEST".equals(item.getType())) {
                List<Question> qs = ctx.getItemQuestions(item.getId());
                long activeCount = qs.stream().filter(q -> q.getStatus() == null || !"DISABLED".equalsIgnoreCase(q.getStatus())).count();

                if (activeCount < minQuestions) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bài luyện tập '%s' chưa đủ số câu hỏi (%d/%d câu).", item.getTitle(), activeCount, minQuestions))
                            .suggestion(String.format("Bổ sung thêm ít nhất %d câu hỏi vào bài tập này.", minQuestions - activeCount))
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                }
            }
        }

        return issues;
    }
}
