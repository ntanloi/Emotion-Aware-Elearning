package com.elearning.emotion.moderation.rule.med;

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
public class Med01_AudioQualityRule implements ModerationRule {

    @Override
    public String id() { return "MED-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getMediaMap() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minSec = policy != null && policy.has("audio") ? policy.path("audio").path("minSec").asInt(2) : 2;
        int maxSec = policy != null && policy.has("audio") ? policy.path("audio").path("maxSec").asInt(600) : 600;

        for (MediaAsset m : ctx.getMediaMap().values()) {
            if ("AUDIO".equalsIgnoreCase(m.getType())) {
                if (m.getUrl() == null || m.getUrl().isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("MEDIA")
                            .targetId(m.getId())
                            .message("Tệp âm thanh không có đường dẫn hợp lệ.")
                            .suggestion("Tải lại file âm thanh audio cho câu hỏi hoặc bài học.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else if (m.getDurationSec() != null) {
                    if (m.getDurationSec() < minSec || m.getDurationSec() > maxSec) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("MEDIA")
                                .targetId(m.getId())
                                .message(String.format("Thời lượng âm thanh (%ds) nằm ngoài khoảng cho phép (%d–%ds).",
                                        m.getDurationSec(), minSec, maxSec))
                                .suggestion("Đảm bảo file âm thanh không quá ngắn hoặc quá dài bất thường.")
                                .confidence(0.95f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
