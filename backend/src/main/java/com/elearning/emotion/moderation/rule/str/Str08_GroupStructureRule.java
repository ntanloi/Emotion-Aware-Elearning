package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Str08_GroupStructureRule implements ModerationRule {

    @Override
    public String id() { return "STR-08"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        if (ctx.getGroups() == null) return issues;

        for (ContentGroup group : ctx.getGroups()) {
            List<ContentItem> groupItems = ctx.getGroupItems(group.getId());

            // Mỗi nhóm hoạt động chỉ cần tối thiểu 1 hoạt động là đạt chuẩn
            if (groupItems == null || groupItems.isEmpty()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("GROUP")
                        .targetId(group.getId())
                        .message(String.format("Nhóm hoạt động '%s' đang để trống (cần tối thiểu 1 hoạt động bên trong).", group.getTitle()))
                        .suggestion("Bổ sung ít nhất 1 bài học hoặc bài luyện tập vào nhóm này.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?group=" + group.getId())
                        .build());
            }
        }

        return issues;
    }
}
