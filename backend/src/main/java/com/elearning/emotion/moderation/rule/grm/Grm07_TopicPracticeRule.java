package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Grm07_TopicPracticeRule implements ModerationRule {

    @Override
    public String id() { return "GRM-07"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        Set<String> topicsWithTheory = new HashSet<>();
        Set<String> topicsWithPractice = new HashSet<>();

        for (ContentItem it : grammarItems) {
            String topic = it.getTopicCode();
            if (topic != null && !topic.isBlank()) {
                String cleanTopic = topic.trim().toUpperCase();
                if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                    topicsWithTheory.add(cleanTopic);
                } else if ("PRACTICE_TEST".equalsIgnoreCase(it.getType())) {
                    topicsWithPractice.add(cleanTopic);
                }
            }
        }

        for (String topic : topicsWithTheory) {
            if (!topicsWithPractice.contains(topic)) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("SECTION")
                        .targetId("GRAMMAR")
                        .message(String.format("Chủ điểm ngữ pháp '%s' có bài học lý thuyết nhưng chưa có bài tập thực hành kèm theo.", topic))
                        .suggestion("Tạo thêm bài tập thực hành (Practice Test) áp dụng trực tiếp cho chủ điểm này.")
                        .confidence(0.9f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
