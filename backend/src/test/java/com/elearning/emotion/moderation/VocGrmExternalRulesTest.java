package com.elearning.emotion.moderation;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.client.AiServiceVocabClient;
import com.elearning.emotion.moderation.client.LanguageToolClient;
import com.elearning.emotion.moderation.client.LanguageToolMatchDto;
import com.elearning.emotion.moderation.client.VocabCheckResultDto;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.grm.Grm05_ExampleGrammarRule;
import com.elearning.emotion.moderation.rule.txt.Txt11_LanguageToolSpellingRule;
import com.elearning.emotion.moderation.rule.voc.Voc06_ExampleContainsWordRule;
import com.elearning.emotion.moderation.rule.voc.Voc08_WordInDictionaryRule;
import com.elearning.emotion.moderation.rule.voc.Voc09_PartOfSpeechMatchRule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VocGrmExternalRulesTest {

    @Mock
    private LanguageToolClient languageToolClient;

    @Mock
    private AiServiceVocabClient aiServiceVocabClient;

    @Test
    @DisplayName("GRM-05: Bỏ qua dòng có dấu ✗ (câu phản ví dụ); bắt câu sai ngữ pháp thông thường")
    void testGrm05_IntentionalWrongMarkerSkipped() {
        Grm05_ExampleGrammarRule rule = new Grm05_ExampleGrammarRule(languageToolClient);
        when(languageToolClient.isAvailable()).thenReturn(true);

        LanguageToolMatchDto grammarError = LanguageToolMatchDto.builder()
                .message("Agreement error: 'boys' is plural, requires 'are'.")
                .ruleId("SUBJECT_VERB_AGREEMENT")
                .issueType("grammar")
                .replacements(Collections.singletonList("are"))
                .build();

        when(languageToolClient.checkText(anyString(), anyString()))
                .thenReturn(Collections.singletonList(grammarError));

        Course course = Course.builder().id("c1").build();

        // 1. Bài học có câu đánh dấu ✗ -> KHÔNG được báo lỗi
        ContentItem itemWithMarker = ContentItem.builder()
                .id("item-1")
                .type("GRAMMAR_ARTICLE")
                .sectionCode("GRAMMAR")
                .title("Hiện tại tiếp diễn")
                .bodyHtml("<p>Ví dụ sai cần tránh:</p><p>✗ The boys is playing football now.</p>")
                .build();

        ModerationContext ctx1 = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(itemWithMarker))
                .build();

        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertTrue(issues1.isEmpty(), "Dòng có dấu ✗ tuyệt đối không được báo lỗi ngữ pháp");

        // 2. Bài học có câu sai ngữ pháp KHÔNG có dấu ✗ -> Báo cảnh báo GRM-05
        ContentItem itemWithoutMarker = ContentItem.builder()
                .id("item-2")
                .type("GRAMMAR_ARTICLE")
                .sectionCode("GRAMMAR")
                .title("Hiện tại tiếp diễn")
                .bodyHtml("<p>The boys is playing football in the school yard.</p>")
                .build();

        ModerationContext ctx2 = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(itemWithoutMarker))
                .build();

        List<RuleIssue> issues2 = rule.evaluate(ctx2);
        assertEquals(1, issues2.size());
        assertEquals("GRM-05", issues2.get(0).getRuleId());
        assertEquals(Severity.WARNING, issues2.get(0).getSeverity());
    }

    @Test
    @DisplayName("TXT-11: Chỉ báo khi >= 2 lỗi hoặc có lỗi ngữ pháp nặng trong một câu hỏi")
    void testTxt11_RequiresMultipleOrSevereErrors() {
        Txt11_LanguageToolSpellingRule rule = new Txt11_LanguageToolSpellingRule(languageToolClient);
        when(languageToolClient.isAvailable()).thenReturn(true);

        Course course = Course.builder().id("c1").build();

        // 1. Chỉ có 1 lỗi gõ phím nhỏ (typographical) -> KHÔNG báo
        LanguageToolMatchDto minorError = LanguageToolMatchDto.builder()
                .message("Possible typo")
                .ruleId("TYPO_MINOR")
                .issueType("typographical")
                .build();

        when(languageToolClient.checkText(anyString(), anyString()))
                .thenReturn(Collections.singletonList(minorError));

        Question q1 = Question.builder()
                .id("q1")
                .promptText("Please review the document carefully before signing.")
                .explanation("The answer is based on the first paragraph.")
                .build();

        ModerationContext ctx1 = ModerationContext.builder()
                .course(course)
                .questions(Collections.singletonList(q1))
                .build();

        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertTrue(issues1.isEmpty(), "Chỉ 1 lỗi chính tả nhỏ không được báo vi phạm");

        // 2. Có 2 lỗi trở lên trong cùng câu hỏi -> Báo TXT-11
        LanguageToolMatchDto error2 = LanguageToolMatchDto.builder()
                .message("Another typo")
                .ruleId("TYPO_2")
                .issueType("typographical")
                .build();

        when(languageToolClient.checkText(anyString(), anyString()))
                .thenReturn(Arrays.asList(minorError, error2));

        List<RuleIssue> issues2 = rule.evaluate(ctx1);
        assertEquals(1, issues2.size());
        assertEquals("TXT-11", issues2.get(0).getRuleId());
    }

    @Test
    @DisplayName("VOC-06: Phát hiện từ thông qua dạng gốc lemma ('ran' khớp 'run')")
    void testVoc06_LemmaMatching() {
        Voc06_ExampleContainsWordRule rule = new Voc06_ExampleContainsWordRule(aiServiceVocabClient);
        when(aiServiceVocabClient.isAvailable()).thenReturn(true);
        when(aiServiceVocabClient.getLemmas(anyString())).thenReturn(Arrays.asList("the", "boy", "run", "fast"));

        Course course = Course.builder().id("c1").build();
        VocabWord vw = VocabWord.builder().id("w1").word("run").build();
        VocabExample ve = VocabExample.builder().id("e1").vocabWord(vw).sentenceEn("The boy ran fast yesterday.").build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .vocabWords(Collections.singletonList(vw))
                .vocabExamples(Collections.singletonList(ve))
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertTrue(issues.isEmpty(), "Câu ví dụ chứa 'ran' phải khớp với từ vựng 'run' nhờ phân tích lemma");
    }

    @Test
    @DisplayName("VOC-08 & VOC-09: Phát hiện từ không có trong từ điển và loại từ sai")
    void testVoc08_Voc09_WordAndPosMismatch() {
        Voc08_WordInDictionaryRule rule08 = new Voc08_WordInDictionaryRule(aiServiceVocabClient);
        Voc09_PartOfSpeechMatchRule rule09 = new Voc09_PartOfSpeechMatchRule(aiServiceVocabClient);

        when(aiServiceVocabClient.isAvailable()).thenReturn(true);

        VocabCheckResultDto invalidWordRes = VocabCheckResultDto.builder()
                .word("xyznotaword")
                .inDictionary(false)
                .posMatch(false)
                .build();

        VocabCheckResultDto posMismatchRes = VocabCheckResultDto.builder()
                .word("beautiful")
                .inDictionary(true)
                .validPos(Collections.singletonList("adjective"))
                .posMatch(false)
                .build();

        Map<String, VocabCheckResultDto> mockMap = new HashMap<>();
        mockMap.put("xyznotaword", invalidWordRes);
        mockMap.put("beautiful", posMismatchRes);

        when(aiServiceVocabClient.checkVocabBatch(any())).thenReturn(mockMap);

        Course course = Course.builder().id("c1").build();
        VocabWord vw1 = VocabWord.builder().id("w1").word("xyznotaword").partOfSpeech("noun").build();
        VocabWord vw2 = VocabWord.builder().id("w2").word("beautiful").partOfSpeech("verb").build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .vocabWords(Arrays.asList(vw1, vw2))
                .build();

        // Kiểm tra VOC-08
        List<RuleIssue> issues08 = rule08.evaluate(ctx);
        assertEquals(1, issues08.size());
        assertEquals("VOC-08", issues08.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues08.get(0).getSeverity());
        assertTrue(issues08.get(0).getMessage().contains("xyznotaword"));

        // Kiểm tra VOC-09
        List<RuleIssue> issues09 = rule09.evaluate(ctx);
        assertEquals(1, issues09.size());
        assertEquals("VOC-09", issues09.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues09.get(0).getSeverity());
        assertTrue(issues09.get(0).getMessage().contains("beautiful"));
    }
}
