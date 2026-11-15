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
public class P6_TextCompletionRule implements ModerationRule {

    // Ký hiệu chỗ trống đánh số trong Part 6: (131), [131], ___(131)___, ...
    private static final Pattern NUMBERED_BLANK_PATTERN = Pattern.compile(
            "(?:_{2,})?\\s*[\\[\\(]\\s*\\d{1,3}\\s*[\\]\\)]\\s*(?:_{2,})?"
    );

    @Override
    public String id() { return "P6-01"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> part6Items = ctx.getSectionItems("PART6");
        if (part6Items.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minBlanks = 3;
        int expectedBlanks = 4;
        int passMinWords = 60;
        int passMaxWords = 200;

        if (policy != null && policy.has("sections") && policy.path("sections").has("PART6")) {
            JsonNode p6 = policy.path("sections").path("PART6");
            minBlanks = p6.path("minBlanksPerPassage").asInt(3);
            expectedBlanks = p6.path("blanksPerPassage").asInt(4);
            JsonNode pw = p6.path("passageWords");
            if (pw.isArray() && pw.size() >= 2) {
                passMinWords = pw.get(0).asInt(60);
                passMaxWords = pw.get(1).asInt(200);
            }
        }

        for (ContentItem item : part6Items) {
            List<Passage> passages = ctx.getItemPassages(item.getId());
            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());

            // P6-04: Mỗi câu hỏi phải gắn đoạn văn
            for (Question q : itemQuestions) {
                if (q.getPassage() == null) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-04")
                            .category("STRUCTURE")
                            .severity(Severity.ERROR)
                            .targetType("QUESTION")
                            .targetId(q.getId())
                            .message("Câu hỏi Part 6 bắt buộc phải gắn với một đoạn văn (Passage).")
                            .suggestion("Liên kết câu hỏi với đoạn văn bài đọc điền từ tương ứng.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }

            for (Passage p : passages) {
                String text = p.getTranscript(); // Đoạn văn đọc hiểu / bài điền từ lưu ở transcript/content
                List<Question> pQuestions = itemQuestions.stream()
                        .filter(q -> q.getPassage() != null && p.getId().equals(q.getPassage().getId()))
                        .toList();

                if (text == null || text.isBlank()) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-01")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message("Đoạn văn Part 6 không có nội dung văn bản.")
                            .suggestion("Nhập bài văn chứa các chỗ trống đánh số cần hoàn thành.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                    continue;
                }

                // P6-01: Đếm số chỗ trống đánh số
                Matcher m = NUMBERED_BLANK_PATTERN.matcher(text);
                int blanksFound = 0;
                while (m.find()) {
                    blanksFound++;
                }

                if (blanksFound < minBlanks) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-01")
                            .category("CONTENT")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Đoạn văn Part 6 có %d chỗ trống đánh số (yêu cầu tối thiểu %d chỗ trống, ví dụ: (131), [132]).",
                                    blanksFound, minBlanks))
                            .suggestion("Đánh số các chỗ trống theo chuẩn đề thi TOEIC Part 6 (ví dụ: '___(131)___').")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P6-02: Số câu hỏi bằng số chỗ trống
                if (blanksFound > 0 && pQuestions.size() != blanksFound) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-02")
                            .category("STRUCTURE")
                            .severity(Severity.ERROR)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Số câu hỏi (%d câu) không khớp với số chỗ trống tìm thấy trong đoạn văn (%d chỗ trống).",
                                    pQuestions.size(), blanksFound))
                            .suggestion("Đảm bảo mỗi chỗ trống trong đoạn văn có đúng 1 câu hỏi tương ứng.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P6-03: Khuyến nghị 4 câu hỏi cho mỗi bài đọc
                if (pQuestions.size() != expectedBlanks) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-03")
                            .category("STRUCTURE")
                            .severity(Severity.WARNING)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Bài đọc Part 6 có %d câu hỏi (chuẩn TOEIC là %d câu hỏi cho mỗi bài điền từ).",
                                    pQuestions.size(), expectedBlanks))
                            .suggestion("Điều chỉnh về đúng 4 câu hỏi/chỗ trống cho mỗi đoạn văn Part 6.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }

                // P6-05: Độ dài đoạn văn
                String[] words = text.trim().split("\\s+");
                if (words.length < passMinWords || words.length > passMaxWords) {
                    issues.add(RuleIssue.builder()
                            .ruleId("P6-05")
                            .category("LANGUAGE")
                            .severity(Severity.WARNING)
                            .targetType("PASSAGE")
                            .targetId(p.getId())
                            .message(String.format("Đoạn văn Part 6 có %d từ (khoảng chuẩn là %d–%d từ).", words.length, passMinWords, passMaxWords))
                            .suggestion("Điều chỉnh độ dài đoạn văn phù hợp với bài thi TOEIC Part 6 chuẩn.")
                            .confidence(0.85f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
