package com.elearning.emotion.moderation.rule.part;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class X01_CrossPartMisplacementRule implements ModerationRule {

    private static final Pattern BLANK_PATTERN = Pattern.compile("_{3,}|-{3,}|\\(\\s*\\)|\\[\\s*\\]");

    @Override
    public String id() { return "X-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        for (ContentItem item : ctx.getItems()) {
            String sec = item.getSectionCode() != null ? item.getSectionCode().toUpperCase() : "";
            List<Question> questions = ctx.getItemQuestions(item.getId());

            for (Question q : questions) {
                String prompt = q.getPromptText();
                if (prompt == null || prompt.isBlank()) continue;

                if ("PART5".equals(sec)) {
                    // Nếu ở Part 5 mà không có chỗ trống nào
                    if (!BLANK_PATTERN.matcher(prompt).find()) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message("Câu hỏi nằm trong Part 5 nhưng không tìm thấy vị trí chỗ trống điền từ (nghi ngờ xếp sai Part).")
                                .suggestion("Kiểm tra lại câu hỏi xem có phải thuộc Part 1, 2 hoặc Part khác hay không.")
                                .confidence(0.85f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                } else if ("PART2".equals(sec)) {
                    // Nếu ở Part 2 mà đề quá dài (> 30 từ)
                    String[] words = prompt.trim().split("\\s+");
                    if (words.length > 30) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu hỏi nằm trong Part 2 nhưng đề có độ dài bất thường (%d từ, nghi ngờ xếp sai Part).", words.length))
                                .suggestion("Part 2 là câu hỏi ngắn nghe hiểu, kiểm tra xem câu hỏi này có bị xếp nhầm Part không.")
                                .confidence(0.85f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
