package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.GrammarTopic;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Grm08_GrammarCoverageRule implements ModerationRule {

    @Override
    public String id() { return "GRM-08"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.INFO; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        Map<String, GrammarTopic> allTopics = ctx.getAllGrammarTopics();
        int totalSystemTopics = allTopics.size();
        if (totalSystemTopics == 0) return issues;

        Set<String> coveredTopics = new HashSet<>();
        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType()) && it.getTopicCode() != null) {
                coveredTopics.add(it.getTopicCode().trim().toUpperCase());
            }
        }

        int covered = coveredTopics.size();
        int pct = (covered * 100) / totalSystemTopics;

        issues.add(RuleIssue.builder()
                .ruleId(id())
                .category(category())
                .severity(defaultSeverity())
                .targetType("SECTION")
                .targetId("GRAMMAR")
                .message(String.format("Khóa học đã bao quát %d/%d chủ điểm ngữ pháp TOEIC trọng điểm (%d%%).",
                        covered, totalSystemTopics, pct))
                .suggestion("Có thể bổ sung thêm các chủ điểm ngữ pháp nâng cao để khóa học toàn diện hơn.")
                .confidence(1.0f)
                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                .build());

        return issues;
    }
}
