package com.elearning.emotion.moderation.rule.part;

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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class P7_ReadingComprehensionRule implements ModerationRule {

    private static final Pattern POSITION_QUESTION_PATTERN = Pattern.compile(
            "(?i)positions?\\s*marked\\s*\\[?1\\]?,?\\s*\\[?2\\]?,?\\s*\\[?3\\]?,?\\s*(?:and)?\\s*\\[?4\\]?"
    );

    private static final Pattern VOCAB_QUOTE_PATTERN = Pattern.compile(
            "(?i)(?:the\\s*word|phrase)\\s*[\"']([^\"']+)[\"']"
    );

    @Override
    public String id() { return "P7-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part7Items = ctx.getSectionItems("PART7");
        if (part7Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minWords = 40;
        int maxPromptWords = 40;
        int minQ = 2;
        int maxQ = 5;

        if (policy != null && policy.has("sections") && policy.path("sections").has("PART7")) {
            JsonNode p7 = policy.path("sections").path("PART7");
            minWords = p7.path("passageMinWords").asInt(40);
            maxPromptWords = p7.path("promptMaxWords").asInt(40);
            JsonNode qpp = p7.path("questionsPerPassage");
            if (qpp.isArray() && qpp.size() >= 2) {
                minQ = qpp.get(0).asInt(2);
                maxQ = qpp.get(1).asInt(5);
            }
        }

        for (ContentItem item : part7Items) {
            List<Passage> passages = ctx.getItemPassages(item.getId());
            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());

            // P7-01: Mỗi câu hỏi phải gắn đoạn văn
            for (Question q : itemQuestions) {
                if (q.getPassage() == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P7-01")
                            .category("STRUCTURE")
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi Part 7 bắt buộc phải gắn với một đoạn văn đọc hiểu (Passage).")
                            .suggestion("Liên kết câu hỏi này với bài đọc đọc hiểu tương ứng.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P7-07: Đề câu hỏi không quá maxPromptWords từ
                if (q.getPromptText() != null) {
                    String[] words = q.getPromptText().trim().split("\\s+");
                    if (words.length > maxPromptWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P7-07")
                                .category("LANGUAGE")
                                .severity(Severity.WARNING)
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Đề câu hỏi Part 7 dài quá mức (%d từ > %d từ quy định).", words.length, maxPromptWords))
                                .suggestion("Rút gọn câu hỏi để tập trung vào ý chính cần kiểm tra.")
                                .confidence(0.85f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }

            for (Passage p : passages) {
                String text = p.getTranscript(); // Nội dung bài đọc
                List<Question> pQuestions = itemQuestions.stream()
                        .filter(q -> q.getPassage() != null && p.getId().equals(q.getPassage().getId()))
                        .toList();

                // P7-03: Đoạn văn >= passageMinWords từ
                if (text == null || text.isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P7-03")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Đoạn văn đọc hiểu Part 7 không có nội dung văn bản.")
                            .suggestion("Nhập nội dung bài đọc (thư từ, email, quảng cáo, bài báo...).")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else {
                    String[] words = text.trim().split("\\s+");
                    if (words.length < minWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId("P7-03")
                                .category("CONTENT")
                                .severity(Severity.ERROR)
                                .targetType("PASSAGE")
                                .targetId(p.getId())
                                .message(String.format("Đoạn văn Part 7 quá ngắn (%d từ < %d từ tối thiểu).", words.length, minWords))
                                .suggestion("Bổ sung nội dung bài đọc để đạt chuẩn độ dài đọc hiểu TOEIC.")
                                .confidence(0.95f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }

                // P7-02: Số câu hỏi cho mỗi bài đọc (2-5 câu)
                if (pQuestions.size() < minQ || pQuestions.size() > maxQ) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P7-02")
                            .category("STRUCTURE")
                            .severity(Severity.WARNING)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Bài đọc Part 7 có %d câu hỏi (khoảng chuẩn TOEIC là %d–%d câu cho mỗi bài đọc).",
                                    pQuestions.size(), minQ, maxQ))
                            .suggestion("Điều chỉnh số câu hỏi đính kèm bài đọc này trong khoảng từ 2 đến 5 câu.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // Kiểm tra nâng cao với từng câu hỏi của passage
                if (text != null && !text.isBlank()) {
                    String lowerText = text.toLowerCase();
                    for (Question q : pQuestions) {
                        String prompt = q.getPromptText();
                        if (prompt == null) continue;

                        // P7-05: Đề câu hỏi điền câu dạng "In which of the positions marked [1], [2], [3], and [4]..."
                        if (POSITION_QUESTION_PATTERN.matcher(prompt).find()) {
                            boolean hasAll4 = text.contains("[1]") && text.contains("[2]")
                                    && text.contains("[3]") && text.contains("[4]");
                            if (!hasAll4) {
                                issues.add(RuleIssue.builder()
                                        .ruleId("P7-05")
                                        .category("CONTENT")
                                        .severity(Severity.ERROR)
                                        .targetType("QUESTION")
                                        .targetId(q.getId())
                                        .message("Đề câu hỏi kiểm tra vị trí điền câu nhưng đoạn văn không có đủ 4 ký hiệu [1], [2], [3], [4].")
                                        .suggestion("Thêm các vị trí [1], [2], [3], [4] vào đoạn văn để học viên chọn đáp án.")
                                        .confidence(0.98f)
                                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                        .build());
                            }
                        }

                        // P7-06: Đề câu hỏi từ đồng nghĩa: The word "..." in ... closest in meaning to
                        Matcher vm = VOCAB_QUOTE_PATTERN.matcher(prompt);
                        if (vm.find() && prompt.toLowerCase().contains("closest in meaning")) {
                            String quotedWord = vm.group(1).trim().toLowerCase();
                            if (!lowerText.contains(quotedWord)) {
                                issues.add(RuleIssue.builder()
                                        .ruleId("P7-06")
                                        .category("CONTENT")
                                        .severity(Severity.ERROR)
                                        .targetType("QUESTION")
                                        .targetId(q.getId())
                                        .message(String.format("Đề câu hỏi hỏi từ đồng nghĩa với '%s' nhưng từ này không xuất hiện trong đoạn văn.", quotedWord))
                                        .suggestion("Kiểm tra lại chính tả hoặc vị trí xuất hiện của từ trong bài đọc.")
                                        .confidence(0.95f)
                                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                        .build());
                            }
                        }
                    }
                }
            }
        }

        return issues;
    }
}
