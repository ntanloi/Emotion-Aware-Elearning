package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.GrammarTopic;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Grm01_TopicCodeRule implements ModerationRule {

    @Override
    public String id() { return "GRM-01"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                String code = it.getTopicCode();
                if (code == null || code.trim().isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Bài học ngữ pháp '%s' chưa được gắn mã chủ điểm (topic_code).", it.getTitle()))
                            .suggestion("Chọn một chủ điểm ngữ pháp từ danh mục chuẩn (ví dụ: TENSE_PRESENT_SIMPLE, RELATIVE_CLAUSE...).")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    GrammarTopic gt = ctx.getGrammarTopic(code.trim());
                    if (gt == null) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("ITEM")
                                .targetId(it.getId())
                                .message(String.format("Chủ điểm ngữ pháp '%s' không tồn tại trong danh mục chủ điểm của hệ thống.", code))
                                .suggestion("Chọn lại chủ điểm ngữ pháp hợp lệ trong danh mục chuẩn.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
