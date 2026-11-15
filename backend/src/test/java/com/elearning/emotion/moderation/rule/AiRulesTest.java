package com.elearning.emotion.moderation.rule;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.enums.ToeicPart;
import com.elearning.emotion.moderation.client.FakeLlmClient;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ai.*;
import com.elearning.emotion.repository.ModerationLexiconRepository;
import com.elearning.emotion.service.LexiconService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class AiRulesTest {

    private FakeLlmClient fakeLlmClient;
    private ObjectMapper objectMapper;
    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        fakeLlmClient = new FakeLlmClient();
        objectMapper = new ObjectMapper();
        sampleCourse = Course.builder()
                .id("c-1")
                .title("Khóa luyện thi TOEIC 750+")
                .description("Khóa học đầy đủ bao gồm 500 câu hỏi Part 5 và 100 câu Part 7 giúp bạn đạt điểm cao.")
                .build();
    }

    @Test
    void testGracefulDegradationWhenDisabled() {
        fakeLlmClient.setEnabled(false);

        Ai01_KeyPlausibilityRule r1 = new Ai01_KeyPlausibilityRule(fakeLlmClient, objectMapper);
        Ai02_AmbiguityRule r2 = new Ai02_AmbiguityRule(fakeLlmClient, objectMapper);
        Ai03_ExplanationQualityRule r3 = new Ai03_ExplanationQualityRule(fakeLlmClient, objectMapper);
        Ai04_GrammarTopicMatchRule r4 = new Ai04_GrammarTopicMatchRule(fakeLlmClient, objectMapper);
        Ai05_VocabMeaningAccuracyRule r5 = new Ai05_VocabMeaningAccuracyRule(fakeLlmClient, objectMapper);
        Ai07_ToeicStyleFitRule r7 = new Ai07_ToeicStyleFitRule(fakeLlmClient, objectMapper);
        Ai08_ClaimsAccuracyRule r8 = new Ai08_ClaimsAccuracyRule(fakeLlmClient, objectMapper);

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .questions(Collections.emptyList())
                .contentItems(Collections.emptyList())
                .vocabWords(Collections.emptyList())
                .build();

        assertTrue(r1.evaluate(ctx).isEmpty());
        assertTrue(r2.evaluate(ctx).isEmpty());
        assertTrue(r3.evaluate(ctx).isEmpty());
        assertTrue(r4.evaluate(ctx).isEmpty());
        assertTrue(r5.evaluate(ctx).isEmpty());
        assertTrue(r7.evaluate(ctx).isEmpty());
        assertTrue(r8.evaluate(ctx).isEmpty());
    }

    @Test
    void testAi01_DetectsPlausibilityMismatchWhenBothConsensus() {
        Question q = Question.builder().id("q-1").content("She ___ to the office every morning.").toeicPart(ToeicPart.PART_5).build();
        AnswerOption optA = AnswerOption.builder().id("o-1").question(q).label("A").content("goes").correct(false).build();
        AnswerOption optB = AnswerOption.builder().id("o-2").question(q).label("B").content("went").correct(false).build();
        AnswerOption optC = AnswerOption.builder().id("o-3").question(q).label("C").content("gone").correct(true).build(); // Teacher set C as correct (wrong!)
        AnswerOption optD = AnswerOption.builder().id("o-4").question(q).label("D").content("going").correct(false).build();

        Map<String, List<AnswerOption>> optionsByQuestion = new HashMap<>();
        optionsByQuestion.put("q-1", List.of(optA, optB, optC, optD));

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .questions(List.of(q))
                .optionsByQuestion(optionsByQuestion)
                .build();

        // Fake LLM returns key_ok=false, pred="A", confidence=0.92
        fakeLlmClient.setCustomResponse("{\"pred\":\"A\",\"key_ok\":false,\"confidence\":0.92,\"reason\":\"Thì hiện tại đơn ngôi thứ 3 số ít cần động từ goes.\"}");

        Ai01_KeyPlausibilityRule rule = new Ai01_KeyPlausibilityRule(fakeLlmClient, objectMapper);
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("AI-01", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getMessage().contains("nghi vấn"));
    }

    @Test
    void testAi02_DetectsAmbiguity() {
        Question q = Question.builder().id("q-2").content("The manager asked everyone to submit ___ report.").toeicPart(ToeicPart.PART_5).build();
        AnswerOption optA = AnswerOption.builder().id("o-1").question(q).label("A").content("their").correct(true).build();
        AnswerOption optB = AnswerOption.builder().id("o-2").question(q).label("B").content("his").correct(false).build();
        AnswerOption optC = AnswerOption.builder().id("o-3").question(q).label("C").content("them").correct(false).build();
        AnswerOption optD = AnswerOption.builder().id("o-4").question(q).label("D").content("theirs").correct(false).build();

        Map<String, List<AnswerOption>> optionsByQuestion = new HashMap<>();
        optionsByQuestion.put("q-2", List.of(optA, optB, optC, optD));

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .questions(List.of(q))
                .optionsByQuestion(optionsByQuestion)
                .build();

        fakeLlmClient.setCustomResponse("{\"ambiguous\":true,\"options_ok\":[\"A\",\"B\"],\"reason\":\"Cả their và his đều có thể chấp nhận trong ngữ cảnh này.\"}");

        Ai02_AmbiguityRule rule = new Ai02_AmbiguityRule(fakeLlmClient, objectMapper);
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("AI-02", issues.get(0).getRuleId());
        assertEquals(Severity.WARNING, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getMessage().contains("nhiều hơn một đáp án"));
    }

    @Test
    void testAi03_DetectsExplanationContradiction() {
        Question q = Question.builder()
                .id("q-3")
                .content("Mr. Park was promoted because of his outstanding dedication.")
                .explanation("Chọn A vì đây là liên từ nối hai mệnh đề, tuy nhiên câu này chỉ có một mệnh đề.")
                .build();

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .questions(List.of(q))
                .build();

        fakeLlmClient.setCustomResponse("{\"explanation_ok\":false,\"issue\":\"Lời giải thích mâu thuẫn trực tiếp với phân tích ngữ pháp của câu.\"}");

        Ai03_ExplanationQualityRule rule = new Ai03_ExplanationQualityRule(fakeLlmClient, objectMapper);
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("AI-03", issues.get(0).getRuleId());
        assertTrue(issues.get(0).getMessage().contains("mâu thuẫn"));
    }

    @Test
    void testAi05_VocabMeaningAccuracy() {
        VocabWord vw = VocabWord.builder()
                .id("vw-1")
                .word("negotiate")
                .partOfSpeech("verb")
                .meaning("bỏ cuộc, đầu hàng") // Hoàn toàn sai nghĩa
                .build();

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .vocabWords(List.of(vw))
                .build();

        fakeLlmClient.setCustomResponse("{\"meaning_ok\":false,\"confidence\":0.95,\"better\":\"đàm phán, thương lượng\"}");

        Ai05_VocabMeaningAccuracyRule rule = new Ai05_VocabMeaningAccuracyRule(fakeLlmClient, objectMapper);
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("AI-05", issues.get(0).getRuleId());
        assertEquals(Severity.WARNING, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getSuggestion().contains("đàm phán, thương lượng"));
    }

    @Test
    void testAi06_ContextSafetyWithAntiHallucination() {
        ModerationLexiconRepository repo = Mockito.mock(ModerationLexiconRepository.class);
        ModerationLexicon lexItem = ModerationLexicon.builder()
                .id("lex-1")
                .category("OFFENSIVE")
                .matchType("WORD")
                .pattern("stupid")
                .severity("CONTEXT")
                .scope("ALL")
                .active(true)
                .build();
        when(repo.findByActiveTrue()).thenReturn(List.of(lexItem));

        LexiconService lexiconService = new LexiconService(repo);
        lexiconService.reloadCache();

        String realContent = "The lecturer said that making mistakes is normal and don't feel stupid when learning.";
        Question q = Question.builder().id("q-6").content(realContent).build();

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse)
                .questions(List.of(q))
                .build();

        // 1. Giả lập LLM bị ảo giác (hallucination): trích dẫn một câu quote KHÔNG hề có trong văn bản
        fakeLlmClient.setCustomResponse("{\"category\":\"INSULT\",\"severity\":\"ERROR\",\"quote\":\"you are an idiot\",\"reason\":\"xúc phạm học viên\"}");

        Ai06_ContextSafetyRule rule = new Ai06_ContextSafetyRule(fakeLlmClient, lexiconService, objectMapper);
        List<RuleIssue> issuesHallucinated = rule.evaluate(ctx);

        // Phải bị loại bỏ bởi rào chắn chống ảo giác!
        assertTrue(issuesHallucinated.isEmpty(), "Cảnh báo có quote ảo giác phải bị loại bỏ");

        // 2. Giả lập LLM trích dẫn câu có thật trong văn bản
        fakeLlmClient.setCustomResponse("{\"category\":\"INSULT\",\"severity\":\"WARNING\",\"quote\":\"feel stupid\",\"reason\":\"từ ngữ có thể làm học viên nản lòng\"}");
        List<RuleIssue> issuesValid = rule.evaluate(ctx);

        assertEquals(1, issuesValid.size());
        assertEquals("AI-06", issuesValid.get(0).getRuleId());
        assertEquals(Severity.WARNING, issuesValid.get(0).getSeverity());
        assertEquals("feel stupid", issuesValid.get(0).getEvidence());
    }

    @Test
    void testAi08_ClaimsAccuracyPrecomputationAndAntiHallucination() {
        // Thực tế chỉ có 2 câu hỏi Part 5
        Question q1 = Question.builder().id("q1").toeicPart(ToeicPart.PART_5).build();
        Question q2 = Question.builder().id("q2").toeicPart(ToeicPart.PART_5).build();

        ModerationContext ctx = ModerationContext.builder()
                .course(sampleCourse) // Course desc có: "Khóa học đầy đủ bao gồm 500 câu hỏi Part 5 và 100 câu Part 7 giúp bạn đạt điểm cao."
                .questions(List.of(q1, q2))
                .build();

        // LLM phát hiện mâu thuẫn với claim trích dẫn thật từ mô tả
        fakeLlmClient.setCustomResponse("{\"claims_mismatch\":[{\"claim\":\"500 câu hỏi Part 5\",\"evidence\":\"Thực tế chỉ có 2 câu hỏi\",\"why\":\"Mô tả phóng đại số lượng bài tập.\"}]}");

        Ai08_ClaimsAccuracyRule rule = new Ai08_ClaimsAccuracyRule(fakeLlmClient, objectMapper);
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("AI-08", issues.get(0).getRuleId());
        assertEquals(Severity.WARNING, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getMessage().contains("500 câu hỏi Part 5"));

        // Khi LLM sinh ra claim ảo giác không có trong mô tả
        fakeLlmClient.setCustomResponse("{\"claims_mismatch\":[{\"claim\":\"cam kết đậu 990 điểm TOEIC trong 3 ngày\",\"evidence\":\"...\",\"why\":\"...\"}]}");
        List<RuleIssue> issuesHallucinated = rule.evaluate(ctx);
        assertTrue(issuesHallucinated.isEmpty(), "Claim ảo giác phải bị loại bỏ");
    }
}
