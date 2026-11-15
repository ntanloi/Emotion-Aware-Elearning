package com.elearning.emotion.moderation.rule.med;

import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Med02_ImageQualityRule implements ModerationRule {

    private static final Set<String> DEFAULT_FORMATS = new HashSet<>(Arrays.asList("jpg", "jpeg", "png", "webp"));

    @Override
    public String id() { return "MED-02"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getMediaMap() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        Set<String> allowedFormats = new HashSet<>(DEFAULT_FORMATS);
        if (policy != null && policy.has("image") && policy.path("image").has("allowedFormats")) {
            JsonNode arr = policy.path("image").path("allowedFormats");
            if (arr.isArray()) {
                allowedFormats.clear();
                arr.forEach(node -> allowedFormats.add(node.asText().toLowerCase().trim()));
            }
        }

        for (MediaAsset m : ctx.getMediaMap().values()) {
            if ("IMAGE".equalsIgnoreCase(m.getType())) {
                String nameOrUrl = m.getFileName() != null ? m.getFileName() : m.getUrl();
                if (nameOrUrl == null || nameOrUrl.isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("MEDIA")
                            .targetId(m.getId())
                            .message("Tệp hình ảnh không có đường dẫn hoặc tên tệp.")
                            .suggestion("Tải lại hình ảnh hợp lệ.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    int dotIndex = nameOrUrl.lastIndexOf('.');
                    if (dotIndex > 0 && dotIndex < nameOrUrl.length() - 1) {
                        String ext = nameOrUrl.substring(dotIndex + 1).toLowerCase();
                        int queryIdx = ext.indexOf('?');
                        if (queryIdx > 0) ext = ext.substring(0, queryIdx);

                        if (!allowedFormats.contains(ext)) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("MEDIA")
                                    .targetId(m.getId())
                                    .message(String.format("Định dạng hình ảnh .%s không thuộc danh sách cho phép (%s).",
                                            ext, String.join(", ", allowedFormats)))
                                    .suggestion("Chuyển đổi hình ảnh sang định dạng chuẩn JPG, PNG hoặc WebP.")
                                    .confidence(1.0f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                        }
                    }
                }
            }
        }

        return issues;
    }
}
