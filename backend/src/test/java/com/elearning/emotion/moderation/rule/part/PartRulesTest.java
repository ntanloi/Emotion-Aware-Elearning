package com.elearning.emotion.moderation.rule.part;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class PartRulesTest {

    @Test
    @DisplayName("P1-01 & P1-02: Bắt lỗi Part 1 thiếu hình ảnh hoặc âm thanh")
    void testP1_Photographs() {
        P1_PhotographsRule rule = new P1_PhotographsRule();
        Course course = Course.builder().id("c1").build();
        ContentItem item = ContentItem.builder().id("it1").sectionCode("PART1").build();

        // Câu hỏi không có ảnh và audio
        Question q1 = Question.builder().id("q1").contentItem(item).build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("PART1", Collections.singletonList(item)))
                .questions(Collections.singletonList(q1))
                .questionsByItem(Map.of("it1", Collections.singletonList(q1)))
                .passagesByItem(Collections.emptyMap())
                .optionsByQuestion(Collections.emptyMap())
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertTrue(issues.stream().anyMatch(i -> "P1-01".equals(i.getRuleId())));
        assertTrue(issues.stream().anyMatch(i -> "P1-02".equals(i.getRuleId())));
    }

    @Test
    @DisplayName("P2-02: Bắt lỗi Part 2 có khác 3 lựa chọn (ví dụ 4 lựa chọn A-D)")
    void testP2_QuestionResponse() {
        P2_QuestionResponseRule rule = new P2_QuestionResponseRule();
        Course course = Course.builder().id("c1").build();
        ContentItem item = ContentItem.builder().id("it2").sectionCode("PART2").build();

        MediaAsset audio = MediaAsset.builder().id("a1").type("AUDIO").build();
        Question q = Question.builder().id("q1").contentItem(item).audio(audio).questionKind("MULTIPLE_CHOICE").build();

        // 4 lựa chọn (thừa D)
        List<AnswerOption> opts = Arrays.asList(
                AnswerOption.builder().id("o1").label("A").build(),
                AnswerOption.builder().id("o2").label("B").build(),
                AnswerOption.builder().id("o3").label("C").build(),
                AnswerOption.builder().id("o4").label("D").build()
        );

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("PART2", Collections.singletonList(item)))
                .questions(Collections.singletonList(q))
                .questionsByItem(Map.of("it2", Collections.singletonList(q)))
                .optionsByQuestion(Map.of("q1", opts))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertTrue(issues.stream().anyMatch(i -> "P2-02".equals(i.getRuleId())));
    }

    @Test
    @DisplayName("P5-01: Bắt lỗi Part 5 không có chỗ trống điền từ")
    void testP5_IncompleteSentences() {
        P5_IncompleteSentencesRule rule = new P5_IncompleteSentencesRule();
        Course course = Course.builder().id("c1").build();
        ContentItem item = ContentItem.builder().id("it5").sectionCode("PART5").build();

        // 1. Không có chỗ trống
        Question q1 = Question.builder()
                .id("q1")
                .contentItem(item)
                .promptText("The marketing department announced the new campaign schedule yesterday.")
                .build();

        ModerationContext ctx1 = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("PART5", Collections.singletonList(item)))
                .questions(Collections.singletonList(q1))
                .questionsByItem(Map.of("it5", Collections.singletonList(q1)))
                .build();

        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("P5-01", issues1.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues1.get(0).getSeverity());

        // 2. Có đúng 1 chỗ trống hợp lệ
        Question q2 = Question.builder()
                .id("q2")
                .contentItem(item)
                .promptText("The marketing department announced the _______ schedule yesterday.")
                .build();

        ModerationContext ctx2 = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("PART5", Collections.singletonList(item)))
                .questions(Collections.singletonList(q2))
                .questionsByItem(Map.of("it5", Collections.singletonList(q2)))
                .build();

        assertTrue(rule.evaluate(ctx2).isEmpty());
    }

    @Test
    @DisplayName("P7-05: Bắt lỗi câu hỏi vị trí câu chèn nhưng bài đọc thiếu ký hiệu [1]..[4]")
    void testP7_ReadingComprehension_PositionMarkers() {
        P7_ReadingComprehensionRule rule = new P7_ReadingComprehensionRule();
        Course course = Course.builder().id("c1").build();
        ContentItem item = ContentItem.builder().id("it7").sectionCode("PART7").build();

        // Bài đọc chỉ có [1] và [2], thiếu [3], [4]
        Passage passage = Passage.builder()
                .id("p1")
                .contentItem(item)
                .transcript("This is a sample business memo for the marketing department. [1] Please review the guidelines. [2] Thank you for your cooperation.")
                .build();

        Question q = Question.builder()
                .id("q1")
                .contentItem(item)
                .passage(passage)
                .promptText("In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong?")
                .build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("PART7", Collections.singletonList(item)))
                .passages(Collections.singletonList(passage))
                .passagesByItem(Map.of("it7", Collections.singletonList(passage)))
                .questions(Collections.singletonList(q))
                .questionsByItem(Map.of("it7", Collections.singletonList(q)))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertTrue(issues.stream().anyMatch(i -> "P7-05".equals(i.getRuleId())));
    }
}
