package com.elearning.emotion.moderation.rule.med;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Med03_VideoQualityRule implements ModerationRule {

    @Override
    public String id() { return "MED-03"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minSec = policy != null && policy.has("video")
                ? policy.path("video").path("minDurationSec").asInt(120) : 120;

        for (ContentItem it : ctx.getItems()) {
            if ("VIDEO_LECTURE".equalsIgnoreCase(it.getType())) {
                MediaAsset vm = it.getVideoMedia();
                if (vm != null) {
                    if (vm.getDurationSec() != null && vm.getDurationSec() < minSec) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("MEDIA")
                                .targetId(vm.getId())
                                .message(String.format("Video bài giảng '%s' có thời lượng %ds quá ngắn (tối thiểu %ds).",
                                        it.getTitle(), vm.getDurationSec(), minSec))
                                .suggestion("Đảm bảo video bài giảng có nội dung đầy đủ và đạt chuẩn thời lượng quy định.")
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
