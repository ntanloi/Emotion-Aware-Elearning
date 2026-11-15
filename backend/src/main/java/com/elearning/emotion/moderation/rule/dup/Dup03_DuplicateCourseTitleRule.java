package com.elearning.emotion.moderation.rule.dup;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Dup03_DuplicateCourseTitleRule implements ModerationRule {

    private final CourseRepository courseRepository;

    @Override
    public String id() { return "DUP-03"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        String title = ctx.getCourse().getTitle();
        if (title == null || title.isBlank()) return issues;

        try {
            List<Course> published = courseRepository.findByStatus("PUBLISHED");
            boolean duplicateFound = published.stream()
                    .anyMatch(c -> !c.getId().equals(ctx.getCourse().getId())
                            && title.trim().equalsIgnoreCase(c.getTitle() != null ? c.getTitle().trim() : ""));

            if (duplicateFound) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message(String.format("Tiêu đề khóa học trùng lặp với một khóa học khác đã xuất bản trên hệ thống: '%s'.", title.trim()))
                        .suggestion("Nên đặt tiêu đề mang nét đặc trưng riêng để tránh gây nhầm lẫn cho học viên.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
            }
        } catch (Exception ignored) {
            // Graceful degradation nếu DB gặp lỗi tạm thời
        }

        return issues;
    }
}
