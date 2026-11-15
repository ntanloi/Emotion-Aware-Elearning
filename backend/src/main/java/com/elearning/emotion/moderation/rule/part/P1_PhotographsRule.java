package com.elearning.emotion.moderation.rule.part;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Passage;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class P1_PhotographsRule implements ModerationRule {

    @Override
    public String id() { return "P1-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part1Items = ctx.getSectionItems("PART1");
        if (part1Items.isEmpty()) return issues;

        for (ContentItem item : part1Items) {
            List<Question> questions = ctx.getItemQuestions(item.getId());
            List<Passage> passages = ctx.getItemPassages(item.getId());

            for (Question q : questions) {
                // P1-01: Bắt buộc có hình ảnh
                boolean hasImage = q.getImage() != null || (q.getPassage() != null && q.getPassage().getImage() != null);
                if (!hasImage && !passages.isEmpty()) {
                    hasImage = passages.stream().anyMatch(p -> p.getImage() != null);
                }
                if (!hasImage) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P1-01")
                            .category(category())
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Part 1 (Photographs) bắt buộc phải có hình ảnh tranh minh họa.")
                            .suggestion("Tải ảnh tranh mô tả cho câu hỏi này.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P1-02: Bắt buộc có file âm thanh
                boolean hasAudio = q.getAudio() != null || (q.getPassage() != null && q.getPassage().getAudio() != null);
                if (!hasAudio && !passages.isEmpty()) {
                    hasAudio = passages.stream().anyMatch(p -> p.getAudio() != null);
                }
                if (!hasAudio) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P1-02")
                            .category(category())
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Part 1 bắt buộc phải có file âm thanh Audio.")
                            .suggestion("Tải file audio đọc 4 lựa chọn cho bức tranh.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P1-03: Đúng 4 lựa chọn
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                    if (options.size() != 4) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P1-03")
                                .category("STRUCTURE")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Part 1 yêu cầu đúng 4 lựa chọn A–D (hiện có %d lựa chọn).", options.size()))
                                .suggestion("Điều chỉnh lại câu hỏi để có đúng 4 đáp án A, B, C, D.")
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
