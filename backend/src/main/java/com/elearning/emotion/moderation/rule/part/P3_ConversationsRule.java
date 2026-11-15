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
public class P3_ConversationsRule implements ModerationRule {

    @Override
    public String id() { return "P3-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part3Items = ctx.getSectionItems("PART3");
        if (part3Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int maxWords = policy != null && policy.has("sections") && policy.path("sections").has("PART3")
                ? policy.path("sections").path("PART3").path("promptMaxWords").asInt(25) : 25;
        int transMin = 40;
        int transMax = 200;
        if (policy != null && policy.has("sections") && policy.path("sections").has("PART3")) {
            JsonNode tw = policy.path("sections").path("PART3").path("transcriptWords");
            if (tw.isArray() && tw.size() >= 2) {
                transMin = tw.get(0).asInt(40);
                transMax = tw.get(1).asInt(200);
            }
        }

        for (ContentItem item : part3Items) {
            List<Passage> passages = ctx.getItemPassages(item.getId());
            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());

            // P3-01 & P3-02: Kiểm tra từng đoạn hội thoại
            for (Passage p : passages) {
                List<Question> pQuestions = itemQuestions.stream()
                        .filter(q -> q.getPassage() != null && p.getId().equals(q.getPassage().getId()))
                        .toList();

                if (pQuestions.isEmpty()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P3-01")
                            .category("STRUCTURE")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Hội thoại Part 3 chưa có câu hỏi nào gắn kèm.")
                            .suggestion("Mỗi đoạn hội thoại Part 3 cần gắn đúng 3 câu hỏi.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else if (pQuestions.size() != 3) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P3-01")
                            .category("STRUCTURE")
                            .severity(Severity.WARNING)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Hội thoại Part 3 có %d câu hỏi (tiêu chuẩn TOEIC là đúng 3 câu hỏi cho mỗi bài hội thoại).", pQuestions.size()))
                            .suggestion("Điều chỉnh số câu hỏi về đúng 3 câu cho mỗi bài hội thoại Part 3.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P3-02: Audio & Transcript bắt buộc
                if (p.getAudio() == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P3-02")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Hội thoại Part 3 thiếu file âm thanh Audio.")
                            .suggestion("Tải file audio đoạn hội thoại 2-3 người nói.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                if (p.getTranscript() == null || p.getTranscript().trim().isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P3-02")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Hội thoại Part 3 thiếu lời thoại (transcript).")
                            .suggestion("Cung cấp nội dung transcript để hiển thị lời giải chi tiết cho học viên.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    // P3-05: Độ dài transcript
                    String[] words = p.getTranscript().trim().split("\\s+");
                    if (words.length < transMin || words.length > transMax) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P3-05")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("PASSAGE")
                                .targetId(p.getId())
                                .message(String.format("Lời thoại hội thoại Part 3 có %d từ (khoảng chuẩn là %d–%d từ).", words.length, transMin, transMax))
                                .suggestion("Điều chỉnh độ dài đoạn hội thoại cho phù hợp với độ khó chuẩn của bài thi TOEIC.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }

            // P3-03 & P3-04: Kiểm tra câu hỏi
            for (Question q : itemQuestions) {
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                    if (options.size() != 4) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P3-03")
                                .category("STRUCTURE")
                                .severity(Severity.ERROR)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu hỏi Part 3 yêu cầu 4 lựa chọn (hiện có %d).", options.size()))
                                .suggestion("Bổ sung đủ 4 đáp án A, B, C, D.")
                                .confidence(1.0f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }

                if (q.getPromptText() != null) {
                    String prompt = q.getPromptText().trim();
                    String[] words = prompt.split("\\s+");
                    if (words.length > maxWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P3-03")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Đề câu hỏi Part 3 dài quá mức (%d từ > %d từ).", words.length, maxWords))
                                .suggestion("Rút gọn câu hỏi để đúng phong cách ngắn gọn của bài thi nghe TOEIC.")
                                .confidence(0.85f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }

                    // P3-04: Đề có chữ "graphic" thì phải có ảnh
                    if (prompt.toLowerCase().contains("graphic")) {
                        boolean hasImage = q.getImage() != null
                                || (q.getPassage() != null && q.getPassage().getImage() != null);
                        if (!hasImage) {
                            issues.add(RuleIssue.builder()
                                    .ruleId("P3-04")
                                    .category("CONTENT")
                                    .severity(Severity.ERROR)
                                    .targetType("QUESTION")
                                    .targetId(q.getId())
                                    .message("Câu hỏi nhắc đến hình ảnh ('graphic') nhưng không có ảnh đính kèm.")
                                    .suggestion("Tải ảnh biểu đồ, lịch trình hoặc hình ảnh minh họa cho câu hỏi này.")
                                    .confidence(0.98f)
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
