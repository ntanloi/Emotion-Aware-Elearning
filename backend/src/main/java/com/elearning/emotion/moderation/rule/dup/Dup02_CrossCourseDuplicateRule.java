package com.elearning.emotion.moderation.rule.dup;

import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Dup02_CrossCourseDuplicateRule implements ModerationRule {

    private final QuestionRepository questionRepository;

    @Override
    public String id() { return "DUP-02"; }

    @Override
    public String category() { return "DUPLICATION"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null || ctx.getQuestions().isEmpty()) return issues;

        String currentCourseId = ctx.getCourse().getId();

        for (Question q : ctx.getQuestions()) {
            String prompt = q.getPromptText();
            if (prompt == null || prompt.trim().length() < 20) continue;

            try {
                List<Question> duplicates = questionRepository.findByPromptTextInOtherCourses(currentCourseId, prompt.trim());
                if (!duplicates.isEmpty()) {
                    Question dup = duplicates.get(0);
                    String sourceCourseTitle = dup.getContentItem() != null && dup.getContentItem().getCourse() != null
                            ? dup.getContentItem().getCourse().getTitle() : "Khác";
                    String sourceCourseId = dup.getContentItem() != null && dup.getContentItem().getCourse() != null
                            ? dup.getContentItem().getCourse().getId() : "";

                    // Thông điệp đầy đủ cho Admin (chứa khóa nguồn và ID nguồn)
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message(String.format("Câu hỏi trùng lặp với khóa học khác: '%s' (Mã khóa: %s).", sourceCourseTitle, sourceCourseId))
                            .suggestion("Biên soạn lại câu hỏi hoặc thay đổi ngữ cảnh để đảm bảo tính độc bản của nội dung khóa học.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + currentCourseId + "/content")
                            .build());
                }
            } catch (Exception ignored) {
                // Graceful fallback nếu DB gặp lỗi tạm thời
            }
        }

        return issues;
    }
}
