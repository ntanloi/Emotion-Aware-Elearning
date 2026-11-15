package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class Str06_PartVideoRequiredRule implements ModerationRule {

    private static final List<String> TOEIC_PARTS = List.of(
            "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7"
    );

    @Override
    public String id() { return "STR-06"; }

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

        for (String part : TOEIC_PARTS) {
            if (ctx.isSectionOpened(part)) {
                List<ContentGroup> groups = ctx.getSectionGroups(part);
                List<ContentItem> items = ctx.getSectionItems(part);

                // Trong Part chỉ cần tối thiểu một nhóm hoạt động có video bài giảng
                boolean hasVideoInGroup = groups != null && groups.stream().anyMatch(g ->
                        ctx.getGroupItems(g.getId()).stream().anyMatch(ContentItem::isVideoLecture)
                );
                boolean hasAnyVideo = items != null && items.stream().anyMatch(ContentItem::isVideoLecture);
                boolean satisfied = hasVideoInGroup || hasAnyVideo;

                if (!satisfied) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("SECTION")
                            .targetId(part)
                            .message(String.format("Mục %s đã mở nhưng chưa có nhóm hoạt động nào chứa video bài giảng.", part))
                            .suggestion("Mỗi phần luyện thi TOEIC (Part 1-7) cần tối thiểu một nhóm hoạt động có video bài giảng hướng dẫn.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=" + part)
                            .build());
                }
            }
        }

        return issues;
    }
}
