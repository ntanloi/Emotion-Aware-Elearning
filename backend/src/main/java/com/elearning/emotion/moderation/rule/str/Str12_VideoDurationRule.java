package com.elearning.emotion.moderation.rule.str;

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
public class Str12_VideoDurationRule implements ModerationRule {

    @Override
    public String id() { return "STR-12"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        JsonNode policy = ctx.getPolicy();
        int minDuration = policy != null && policy.has("video") ? policy.path("video").path("minDurationSec").asInt(30) : 30;

        if (ctx.getItems() == null) return issues;

        for (ContentItem item : ctx.getItems()) {
            if ("VIDEO_LECTURE".equals(item.getType())) {
                MediaAsset video = item.getVideoMedia();
                if (video == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bài học '%s' chưa được gắn file video.", item.getTitle()))
                            .suggestion("Tải lên hoặc chọn video bài giảng hợp lệ.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                } else if (video.getDurationSec() == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(Severity.WARNING)
                            .targetType("MEDIA")
                            .targetId(video.getId())
                            .message(String.format("Bài học '%s': Thời lượng video chưa được xác định.", item.getTitle()))
                            .suggestion("Kiểm tra lại định dạng file video để hệ thống nhận diện thời lượng chuẩn xác.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                } else if (video.getDurationSec() < minDuration) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("MEDIA")
                            .targetId(video.getId())
                            .message(String.format("Bài học '%s': Video quá ngắn (%d giây, tối thiểu %d giây).", item.getTitle(), video.getDurationSec(), minDuration))
                            .suggestion("Bài giảng video cần có thời lượng đủ truyền tải kiến thức, tối thiểu từ " + minDuration + " giây trở lên.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                }
            }
        }

        return issues;
    }
}
