package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class CmRulesTest {

    @Test
    @DisplayName("CM-01: Bắt lỗi 0 đáp án đúng hoặc nhiều hơn 1 đáp án đúng")
    void testCm01_SingleCorrectAnswer() {
        Cm01_SingleCorrectAnswerRule rule = new Cm01_SingleCorrectAnswerRule();
        Course course = Course.builder().id("c1").build();

        // 1. Câu hỏi không có đáp án đúng nào
        Question q1 = Question.builder().id("q1").questionKind("MULTIPLE_CHOICE").build();
        List<AnswerOption> opts1 = Arrays.asList(
                AnswerOption.builder().id("o1").label("A").isCorrect(false).build(),
                AnswerOption.builder().id("o2").label("B").isCorrect(false).build()
        );

        ModerationContext ctx1 = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q1))
                .optionsByQuestion(Map.of("q1", opts1))
                .build();

        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("CM-01", issues1.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues1.get(0).getSeverity());
        assertTrue(issues1.get(0).getMessage().contains("chưa được đánh dấu đáp án đúng"));

        // 2. Câu hỏi có 2 đáp án đúng
        Question q2 = Question.builder().id("q2").questionKind("MULTIPLE_CHOICE").build();
        List<AnswerOption> opts2 = Arrays.asList(
                AnswerOption.builder().id("o3").label("A").isCorrect(true).build(),
                AnswerOption.builder().id("o4").label("B").isCorrect(true).build()
        );

        ModerationContext ctx2 = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q2))
                .optionsByQuestion(Map.of("q2", opts2))
                .build();

        List<RuleIssue> issues2 = rule.evaluate(ctx2);
        assertEquals(1, issues2.size());
        assertTrue(issues2.get(0).getMessage().contains("có 2 đáp án được đánh dấu đúng"));

        // 3. Đúng 1 đáp án đúng
        Question q3 = Question.builder().id("q3").questionKind("MULTIPLE_CHOICE").build();
        List<AnswerOption> opts3 = Arrays.asList(
                AnswerOption.builder().id("o5").label("A").isCorrect(true).build(),
                AnswerOption.builder().id("o6").label("B").isCorrect(false).build()
        );

        ModerationContext ctx3 = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q3))
                .optionsByQuestion(Map.of("q3", opts3))
                .build();

        assertTrue(rule.evaluate(ctx3).isEmpty());
    }

    @Test
    @DisplayName("CM-04: Bắt lỗi 2 lựa chọn trắc nghiệm trùng lặp nội dung")
    void testCm04_DistinctOptionContents() {
        Cm04_DistinctOptionContentsRule rule = new Cm04_DistinctOptionContentsRule();
        Course course = Course.builder().id("c1").build();

        Question q = Question.builder().id("q1").questionKind("MULTIPLE_CHOICE").build();
        List<AnswerOption> opts = Arrays.asList(
                AnswerOption.builder().id("o1").label("A").content("Increase").build(),
                AnswerOption.builder().id("o2").label("B").content("increase ").build(), // Trùng sau normalize
                AnswerOption.builder().id("o3").label("C").content("Decrease").build(),
                AnswerOption.builder().id("o4").label("D").content("Constant").build()
        );

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q))
                .optionsByQuestion(Map.of("q1", opts))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertEquals(1, issues.size());
        assertEquals("CM-04", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
    }

    @Test
    @DisplayName("CM-08: Bắt lỗi lời giải thích mâu thuẫn với đáp án đúng")
    void testCm08_ExplanationContradiction() {
        Cm08_ExplanationContradictionRule rule = new Cm08_ExplanationContradictionRule();
        Course course = Course.builder().id("c1").build();

        Question q = Question.builder()
                .id("q1")
                .questionKind("MULTIPLE_CHOICE")
                .explanation("Dựa vào ngữ cảnh câu và thì hiện tại đơn, ta chọn đáp án B.")
                .build();

        // Hệ thống đang đánh dấu đúng là A
        List<AnswerOption> opts = Arrays.asList(
                AnswerOption.builder().id("o1").label("A").isCorrect(true).build(),
                AnswerOption.builder().id("o2").label("B").isCorrect(false).build()
        );

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q))
                .optionsByQuestion(Map.of("q1", opts))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertEquals(1, issues.size());
        assertEquals("CM-08", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getMessage().contains("chọn đáp án B"));
    }

    @Test
    @DisplayName("CM-09: Bắt lỗi trùng lặp đề câu hỏi trong cùng khóa học")
    void testCm09_DuplicateQuestionPrompt() {
        Cm09_DuplicateQuestionPromptRule rule = new Cm09_DuplicateQuestionPromptRule();
        Course course = Course.builder().id("c1").build();

        Question q1 = Question.builder().id("q1").promptText("What is the main topic of the conversation?").build();
        Question q2 = Question.builder().id("q2").promptText("What is the main topic of the conversation? ").build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .questions(Arrays.asList(q1, q2))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertEquals(1, issues.size());
        assertEquals("CM-09", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
    }
}
