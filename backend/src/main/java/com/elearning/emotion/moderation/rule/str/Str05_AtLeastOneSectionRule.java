package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class Str05_AtLeastOneSectionRule implements ModerationRule {

    @Override
    public String id() { return "STR-05"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if ("EXAM".equalsIgnoreCase(ctx.getProfile())) {
            return Collections.emptyList();
        }

        if (ctx.getOpenedSections() == null || ctx.getOpenedSections().isEmpty()) {
            return List.of(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message("Khóa học chưa có nội dung. Bạn chỉ cần biên soạn và hoàn thành đạt chuẩn ít nhất 1 phần nội dung bất kỳ là đủ điều kiện gửi duyệt.")
                    .suggestion("Chọn 1 phần bất kỳ trong danh sách bên dưới (như Từ vựng, Ngữ pháp hoặc Part 1) rồi nhấn 'Bắt đầu soạn' để tạo nội dung.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }

        return Collections.emptyList();
    }
}
