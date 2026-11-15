package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class Str14_EmptySectionOrGroupRule implements ModerationRule {

    @Override
    public String id() { return "STR-14"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        // STR-08 đã xử lý nhóm rỗng ở mức BLOCKER (mỗi nhóm hoạt động cần tối thiểu 1 hoạt động).
        return Collections.emptyList();
    }
}
