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
public class P4_TalksRule implements ModerationRule {

    @Override
    public String id() { return "P4-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part4Items = ctx.getSectionItems("PART4");
        if (part4Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int transMin = 60;
        int transMax = 250;
        if (policy != null && policy.has("sections") && policy.path("sections").has("PART4")) {
            JsonNode tw = policy.path("sections").path("PART4").path("transcriptWords");
            if (tw.isArray() && tw.size() >= 2) {
                transMin = tw.get(0).asInt(60);
                transMax = tw.get(1).asInt(250);
            }
        }

        for (ContentItem item : part4Items) {
            List<Passage> passages = ctx.getItemPassages(item.getId());
            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());

            for (Passage p : passages) {
                List<Question> pQuestions = itemQuestions.stream()
                        .filter(q -> q.getPassage() != null && p.getId().equals(q.getPassage().getId()))
                        .toList();

                if (pQuestions.isEmpty()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P4-01")
                            .category("STRUCTURE")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Bài nói ngắn Part 4 chưa có câu hỏi nào gắn kèm.")
                            .suggestion("Mỗi bài nói ngắn Part 4 cần gắn đúng 3 câu hỏi.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else if (pQuestions.size() != 3) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P4-01")
                            .category("STRUCTURE")
                            .severity(Severity.WARNING)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Bài nói Part 4 có %d câu hỏi (tiêu chuẩn TOEIC là đúng 3 câu hỏi cho mỗi bài nói).", pQuestions.size()))
                            .suggestion("Điều chỉnh số câu hỏi về đúng 3 câu cho mỗi bài nói Part 4.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                if (p.getAudio() == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P4-02")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Bài nói Part 4 thiếu file âm thanh Audio.")
                            .suggestion("Tải file audio bài diễn thuyết/thông báo.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                if (p.getTranscript() == null || p.getTranscript().trim().isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P4-02")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Bài nói Part 4 thiếu lời thoại (transcript).")
                            .suggestion("Cung cấp nội dung transcript để hiển thị lời giải chi tiết cho học viên.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    String[] words = p.getTranscript().trim().split("\\s+");
                    if (words.length < transMin || words.length > transMax) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P4-03")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("PASSAGE")
                                .targetId(p.getId())
                                .message(String.format("Lời thoại bài nói Part 4 có %d từ (khoảng chuẩn là %d–%d từ).", words.length, transMin, transMax))
                                .suggestion("Điều chỉnh độ dài đoạn nói cho phù hợp với đề thi TOEIC chuẩn.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }

            for (Question q : itemQuestions) {
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                    if (options.size() != 4) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P4-03")
                                .category("STRUCTURE")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu hỏi Part 4 yêu cầu 4 lựa chọn (hiện có %d).", options.size()))
                                .suggestion("Bổ sung đủ 4 đáp án A, B, C, D.")
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
