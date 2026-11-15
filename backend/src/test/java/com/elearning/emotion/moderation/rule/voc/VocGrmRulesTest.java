package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.grm.Grm01_TopicCodeRule;
import com.elearning.emotion.moderation.rule.grm.Grm02_ArticleLengthRule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class VocGrmRulesTest {

    @Test
    @DisplayName("VOC-05 & VOC-06: Bắt lỗi từ vựng thiếu ví dụ hoặc ví dụ không chứa từ")
    void testVoc05And06_ExampleSentenceRules() {
        Voc05_ExampleSentenceRule r05 = new Voc05_ExampleSentenceRule();
        Voc06_ExampleContainsWordRule r06 = new Voc06_ExampleContainsWordRule(null);

        Course course = Course.builder().id("c1").build();

        // 1. Từ vựng không có ví dụ nào
        VocabWord w1 = VocabWord.builder().id("w1").word("negotiate").build();
        ModerationContext ctx1 = ModerationContext.builder()
                .course(course)
                .vocabWords(Collections.singletonList(w1))
                .examplesByWord(Collections.emptyMap())
                .build();

        List<RuleIssue> issues05 = r05.evaluate(ctx1);
        assertEquals(1, issues05.size());
        assertEquals("VOC-05", issues05.get(0).getRuleId());

        // 2. Từ vựng có ví dụ nhưng ví dụ không chứa từ đó
        VocabWord w2 = VocabWord.builder().id("w2").word("accommodate").build();
        VocabExample ex2 = VocabExample.builder()
                .id("e2")
                .word(w2)
                .sentenceEn("The company signed a contract with the client yesterday.")
                .sentenceVi("Công ty đã ký hợp đồng với khách hàng ngày hôm qua.")
                .build();

        ModerationContext ctx2 = ModerationContext.builder()
                .course(course)
                .vocabWords(Collections.singletonList(w2))
                .examplesByWord(Map.of("w2", Collections.singletonList(ex2)))
                .build();

        List<RuleIssue> issues06 = r06.evaluate(ctx2);
        assertEquals(1, issues06.size());
        assertEquals("VOC-06", issues06.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues06.get(0).getSeverity());
    }

    @Test
    @DisplayName("GRM-01: Bắt bài học ngữ pháp thiếu hoặc gắn sai mã chủ điểm topic_code")
    void testGrm01_TopicCode() {
        Grm01_TopicCodeRule rule = new Grm01_TopicCodeRule();
        Course course = Course.builder().id("c1").build();

        // Bài học ngữ pháp gắn mã chủ điểm không tồn tại
        ContentItem item = ContentItem.builder()
                .id("it1")
                .type("GRAMMAR_ARTICLE")
                .sectionCode("GRAMMAR")
                .topicCode("NON_EXISTING_TOPIC_CODE")
                .title("Thì Hiện Tại Hoàn Thành")
                .build();

        ModerationContext ctx = ModerationContext.builder()
                .course(course)
                .items(Collections.singletonList(item))
                .itemsBySection(Map.of("GRAMMAR", Collections.singletonList(item)))
                .grammarTopicMap(Collections.emptyMap()) // Không có mã này trong hệ thống
                .build();

        List<RuleIssue> issues = rule.evaluate(ctx);
        assertEquals(1, issues.size());
        assertEquals("GRM-01", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
    }
}
