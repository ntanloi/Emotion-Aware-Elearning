package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.service.LexiconService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TxtRulesTest {

    @Test
    @DisplayName("TXT-01: Bắt số điện thoại và email cá nhân trong mô tả hoặc lời giải")
    void testTxt01_ContactInfo() {
        Txt01_ContactInfoRule rule = new Txt01_ContactInfoRule();

        Course c = Course.builder()
                .id("c1")
                .title("Luyện thi TOEIC Cấp tốc")
                .description("Liên hệ trực tiếp qua Zalo/SĐT: 0912345678 hoặc email trogiang@gmail.com để nhận tài liệu.")
                .build();

        ModerationContext ctx = ModerationContext.builder().course(c).build();
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(2, issues.size()); // 1 phone + 1 email
        assertTrue(issues.stream().allMatch(i -> Severity.ERROR.equals(i.getSeverity())));
        assertTrue(issues.stream().allMatch(i -> "SAFETY".equals(i.getCategory())));
    }

    @Test
    @DisplayName("TXT-04: Bắt cam kết điểm số 900+ TOEIC hoặc lộ đề")
    void testTxt04_ScoreGuarantee() {
        LexiconService lexiconService = Mockito.mock(LexiconService.class);
        Txt04_ScoreGuaranteeRule rule = new Txt04_ScoreGuaranteeRule(lexiconService);

        Course c = Course.builder()
                .id("c1")
                .title("Khóa học cam kết 900+ TOEIC bao đỗ")
                .description("Phương pháp học cấp tốc đạt điểm cao.")
                .build();

        ModerationContext ctx = ModerationContext.builder().course(c).build();
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("TXT-04", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
        assertTrue(issues.get(0).getMessage().contains("cam kết 900+ TOEIC"));
    }

    @Test
    @DisplayName("TXT-09: Bắt mã độc HTML/JavaScript (<script>, <iframe>, onclick)")
    void testTxt09_MaliciousHtml() {
        Txt09_MaliciousHtmlRule rule = new Txt09_MaliciousHtmlRule();

        Course c = Course.builder()
                .id("c1")
                .title("TOEIC Foundation")
                .description("<p>Khóa học TOEIC căn bản.<script>alert('xss');</script></p>")
                .build();

        ModerationContext ctx = ModerationContext.builder().course(c).build();
        List<RuleIssue> issues = rule.evaluate(ctx);

        assertEquals(1, issues.size());
        assertEquals("TXT-09", issues.get(0).getRuleId());
        assertEquals(Severity.ERROR, issues.get(0).getSeverity());
        assertEquals("SECURITY", issues.get(0).getCategory());
    }
}
