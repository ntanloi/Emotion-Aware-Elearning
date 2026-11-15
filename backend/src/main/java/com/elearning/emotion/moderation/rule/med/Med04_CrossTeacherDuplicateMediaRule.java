package com.elearning.emotion.moderation.rule.med;

import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Med04_CrossTeacherDuplicateMediaRule implements ModerationRule {

    @Override
    public String id() { return "MED-04"; }

    @Override
    public String category() { return "COPYRIGHT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getMediaMap() == null) return issues;

        String currentTeacherId = ctx.getCourse().getTeacher() != null ? ctx.getCourse().getTeacher().getId() : null;

        for (MediaAsset m : ctx.getMediaMap().values()) {
            if (m.getUploader() != null && currentTeacherId != null
                    && !currentTeacherId.equals(m.getUploader().getId())) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("MEDIA")
                        .targetId(m.getId())
                        .message(String.format("Tệp media '%s' có nguồn gốc được tải lên bởi một tài khoản giảng viên khác.",
                                m.getFileName() != null ? m.getFileName() : m.getId()))
                        .suggestion("Đảm bảo bạn có quyền sử dụng tài nguyên này trên hệ thống.")
                        .confidence(0.9f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
