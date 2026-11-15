package com.elearning.emotion.moderation.rule.part;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Passage;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class P2_QuestionResponseRule implements ModerationRule {

    @Override
    public String id() { return "P2-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part2Items = ctx.getSectionItems("PART2");
        if (part2Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int maxWords = policy != null && policy.has("sections") && policy.path("sections").has("PART2")
                ? policy.path("sections").path("PART2").path("promptMaxWords").asInt(25) : 25;

        for (ContentItem item : part2Items) {
            List<Question> questions = ctx.getItemQuestions(item.getId());
            List<Passage> passages = ctx.getItemPassages(item.getId());

            for (Question q : questions) {
                // P2-01: Audio bắt buộc
                boolean hasAudio = q.getAudio() != null || (q.getPassage() != null && q.getPassage().getAudio() != null);
                if (!hasAudio && !passages.isEmpty()) {
                    hasAudio = passages.stream().anyMatch(p -> p.getAudio() != null);
                }
                if (!hasAudio) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P2-01")
                            .category(category())
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Part 2 (Question-Response) bắt buộc phải có file âm thanh Audio.")
                            .suggestion("Tải file audio câu hỏi và các phản hồi A, B, C.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P2-02: Đúng 3 lựa chọn (A–C)
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                    if (options.size() != 3) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P2-02")
                                .category("STRUCTURE")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Part 2 chuẩn TOEIC chỉ có đúng 3 lựa chọn (A–C), hiện câu này có %d lựa chọn.", options.size()))
                                .suggestion("Xóa bớt lựa chọn D thừa hoặc bổ sung đủ 3 lựa chọn A, B, C.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }

                // P2-03: Đề không quá promptMaxWords từ
                if (q.getPromptText() != null && !q.getPromptText().isBlank()) {
                    String[] words = q.getPromptText().trim().split("\\s+");
                    if (words.length > maxWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P2-03")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Đề câu hỏi Part 2 dài quá mức (%d từ > %d từ quy định).", words.length, maxWords))
                                .suggestion("Part 2 thường chỉ là câu hỏi hoặc câu nhận định ngắn dưới 25 từ.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
