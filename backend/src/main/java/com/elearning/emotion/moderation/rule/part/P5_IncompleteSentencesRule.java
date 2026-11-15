package com.elearning.emotion.moderation.rule.part;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class P5_IncompleteSentencesRule implements ModerationRule {

    private static final Pattern BLANK_PATTERN = Pattern.compile("_{3,}|-{3,}|\\(\\s*\\)|\\[\\s*\\]");

    @Override
    public String id() { return "P5-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part5Items = ctx.getSectionItems("PART5");
        if (part5Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minWords = 6;
        int maxWords = 60;
        if (policy != null && policy.has("sections") && policy.path("sections").has("PART5")) {
            JsonNode pw = policy.path("sections").path("PART5").path("promptWords");
            if (pw.isArray() && pw.size() >= 2) {
                minWords = pw.get(0).asInt(6);
                maxWords = pw.get(1).asInt(60);
            }
        }

        for (ContentItem item : part5Items) {
            List<Question> questions = ctx.getItemQuestions(item.getId());

            for (Question q : questions) {
                String prompt = q.getPromptText();

                // P5-01: Đúng 1 chỗ trống
                if (prompt == null || prompt.isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P5-01")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi Part 5 không có nội dung đề.")
                            .suggestion("Nhập câu chứa chỗ trống để học viên điền từ.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    Matcher m = BLANK_PATTERN.matcher(prompt);
                    int blankCount = 0;
                    while (m.find()) {
                        blankCount++;
                    }

                    if (blankCount == 0) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P5-01")
                                .category("CONTENT")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message("Câu hỏi Part 5 (Incomplete Sentences) thiếu chỗ trống điền từ (ví dụ: '_______' hoặc '( )').")
                                .suggestion("Thêm ký hiệu chỗ trống '_______' vào vị trí cần điền trong câu.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    } else if (blankCount > 1) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P5-01")
                                .category("CONTENT")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu hỏi Part 5 có %d chỗ trống (tiêu chuẩn TOEIC Part 5 chỉ có đúng 1 chỗ trống).", blankCount))
                                .suggestion("Điều chỉnh lại để câu hỏi chỉ có 1 vị trí cần điền.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }

                    // P5-03: Độ dài đề
                    String[] words = prompt.trim().split("\\s+");
                    if (words.length < minWords || words.length > maxWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P5-03")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Độ dài câu hỏi Part 5 có %d từ (khoảng chuẩn TOEIC là %d–%d từ).", words.length, minWords, maxWords))
                                .suggestion("Điều chỉnh độ dài câu hỏi phù hợp với format Part 5 chuẩn.")
                                .confidence(0.85f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }

                // P5-02: Không gắn đoạn văn (câu độc lập)
                if (q.getPassage() != null) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P5-02")
                            .category("STRUCTURE")
                            .severity(Severity.WARNING)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi Part 5 bị gắn đoạn văn (Part 5 là các câu đơn độc lập).")
                            .suggestion("Gỡ liên kết đoạn văn khỏi câu hỏi Part 5 này.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P5-04: Các lựa chọn không giống hệt nhau
                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                if (options.size() >= 2) {
                    Set<String> uniqueOpts = new HashSet<>();
                    for (AnswerOption opt : options) {
                        if (opt.getContent() != null) {
                            uniqueOpts.add(TextNormalizer.normalizeBase(opt.getContent()));
                        }
                    }
                    if (uniqueOpts.size() == 1) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P5-04")
                                .category("CONTENT")
                                .severity(Severity.WARNING)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message("Tất cả các lựa chọn trong câu hỏi này hoàn toàn giống nhau.")
                                .suggestion("Sửa lại 4 phương án khác nhau để học viên lựa chọn.")
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
