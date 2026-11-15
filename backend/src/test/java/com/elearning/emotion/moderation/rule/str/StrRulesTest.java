package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class StrRulesTest {

    private ObjectMapper objectMapper;
    private HtmlSanitizerService htmlSanitizerService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        htmlSanitizerService = new HtmlSanitizerService();
    }

    @Test
    @DisplayName("STR-01: Chặn tiêu đề quá ngắn hoặc chứa toàn ký tự đặc biệt")
    void testStr01_CourseTitle() {
        Str01_CourseTitleRule rule = new Str01_CourseTitleRule();

        // 1. Tiêu đề ngắn < 5 ký tự
        Course c1 = Course.builder().id("c1").title("TOE").build();
        ModerationContext ctx1 = ModerationContext.builder().course(c1).build();
        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("STR-01", issues1.get(0).getRuleId());
        assertEquals(Severity.BLOCKER, issues1.get(0).getSeverity());

        // 2. Tiêu đề toàn ký tự đặc biệt
        Course c2 = Course.builder().id("c2").title("@#$%^&*!").build();
        ModerationContext ctx2 = ModerationContext.builder().course(c2).build();
        List<RuleIssue> issues2 = rule.evaluate(ctx2);
        assertTrue(issues2.stream().anyMatch(i -> i.getMessage().contains("toàn ký tự đặc biệt")));

        // 3. Tiêu đề hợp lệ
        Course c3 = Course.builder().id("c3").title("Luyện thi TOEIC Cấp tốc 650+").build();
        ModerationContext ctx3 = ModerationContext.builder().course(c3).build();
        List<RuleIssue> issues3 = rule.evaluate(ctx3);
        assertTrue(issues3.isEmpty());
    }

    @Test
    @DisplayName("STR-02: Chặn mô tả thuần chữ dưới 100 ký tự")
    void testStr02_CourseDescription() {
        Str02_CourseDescriptionRule rule = new Str02_CourseDescriptionRule(htmlSanitizerService);

        // Mô tả ngắn
        Course c1 = Course.builder().id("c1").description("<p>Khóa học rất hay và bổ ích.</p>").build();
        ModerationContext ctx1 = ModerationContext.builder().course(c1).build();
        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("STR-02", issues1.get(0).getRuleId());

        // Mô tả dài >= 100 ký tự
        String longDesc = "<p>Khóa học này cung cấp lộ trình luyện thi toàn diện từ 450 lên 650 điểm TOEIC với đầy đủ các bài giảng video phân tích chi tiết mẹo làm bài và hệ thống bài tập trắc nghiệm phong phú.</p>";
        Course c2 = Course.builder().id("c2").description(longDesc).build();
        ModerationContext ctx2 = ModerationContext.builder().course(c2).build();
        List<RuleIssue> issues2 = rule.evaluate(ctx2);
        assertTrue(issues2.isEmpty());
    }

    @Test
    @DisplayName("STR-03: Chặn khóa học thiếu ảnh bìa cover")
    void testStr03_CourseCover() {
        Str03_CourseCoverRule rule = new Str03_CourseCoverRule();

        // Không có coverMedia
        Course c1 = Course.builder().id("c1").coverMedia(null).build();
        ModerationContext ctx1 = ModerationContext.builder().course(c1).build();
        assertEquals(1, rule.evaluate(ctx1).size());

        // Có coverMedia
        MediaAsset cover = MediaAsset.builder().id("m1").url("http://example.com/cover.png").build();
        Course c2 = Course.builder().id("c2").coverMedia(cover).build();
        ModerationContext ctx2 = ModerationContext.builder().course(c2).build();
        assertTrue(rule.evaluate(ctx2).isEmpty());
    }

    @Test
    @DisplayName("STR-04: Chặn giá gốc nhỏ hơn giá bán")
    void testStr04_CoursePrice() {
        Str04_CoursePriceRule rule = new Str04_CoursePriceRule();

        // Giá gốc < giá bán
        Course c1 = Course.builder().id("c1")
                .price(BigDecimal.valueOf(200000))
                .originalPrice(BigDecimal.valueOf(150000))
                .build();
        ModerationContext ctx1 = ModerationContext.builder().course(c1).build();
        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertTrue(issues1.get(0).getMessage().contains("Giá gốc"));

        // Giá gốc >= giá bán hợp lệ
        Course c2 = Course.builder().id("c2")
                .price(BigDecimal.valueOf(200000))
                .originalPrice(BigDecimal.valueOf(300000))
                .build();
        ModerationContext ctx2 = ModerationContext.builder().course(c2).build();
        assertTrue(rule.evaluate(ctx2).isEmpty());
    }

    @Test
    @DisplayName("STR-06: Chặn Part 1 đã mở nhưng thiếu video bài giảng")
    void testStr06_PartVideoRequired() {
        Str06_PartVideoRequiredRule rule = new Str06_PartVideoRequiredRule();

        // Part 1 đã mở nhưng chỉ có PRACTICE_TEST
        ContentItem item1 = ContentItem.builder().id("it1").sectionCode("PART1").type("PRACTICE_TEST").build();
        ModerationContext ctx1 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .openedSections(Set.of("PART1"))
                .itemsBySection(Map.of("PART1", List.of(item1)))
                .build();
        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("STR-06", issues1.get(0).getRuleId());

        // Part 1 có VIDEO_LECTURE
        ContentItem itemVideo = ContentItem.builder().id("it2").sectionCode("PART1").type("VIDEO_LECTURE").build();
        ModerationContext ctx2 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .openedSections(Set.of("PART1"))
                .itemsBySection(Map.of("PART1", List.of(itemVideo, item1)))
                .build();
        assertTrue(rule.evaluate(ctx2).isEmpty());

        // Part 1 có 2 nhóm hoạt động: chỉ cần tối thiểu 1 nhóm có video bài giảng là đạt chuẩn
        ContentGroup g1 = ContentGroup.builder().id("g1").sectionCode("PART1").title("Nhóm 1 có video").build();
        ContentGroup g2 = ContentGroup.builder().id("g2").sectionCode("PART1").title("Nhóm 2 chỉ có bài tập").build();
        ModerationContext ctx3 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .openedSections(Set.of("PART1"))
                .groupsBySection(Map.of("PART1", List.of(g1, g2)))
                .itemsByGroup(Map.of(
                        "g1", List.of(itemVideo),
                        "g2", List.of(item1)
                ))
                .itemsBySection(Map.of("PART1", List.of(itemVideo, item1)))
                .build();
        assertTrue(rule.evaluate(ctx3).isEmpty());

        // Part 1 có 2 nhóm hoạt động nhưng KHÔNG nhóm nào có video bài giảng
        ModerationContext ctx4 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .openedSections(Set.of("PART1"))
                .groupsBySection(Map.of("PART1", List.of(g1, g2)))
                .itemsByGroup(Map.of(
                        "g1", List.of(item1),
                        "g2", List.of(item1)
                ))
                .itemsBySection(Map.of("PART1", List.of(item1)))
                .build();
        List<RuleIssue> issues4 = rule.evaluate(ctx4);
        assertEquals(1, issues4.size());
        assertEquals("STR-06", issues4.get(0).getRuleId());
    }

    @Test
    @DisplayName("STR-08: Mỗi nhóm hoạt động chỉ cần tối thiểu 1 hoạt động là đạt chuẩn")
    void testStr08_GroupStructure() {
        Str08_GroupStructureRule rule = new Str08_GroupStructureRule();

        ContentGroup gEmpty = ContentGroup.builder().id("g0").title("Nhóm rỗng").build();
        ContentGroup gPracticeOnly = ContentGroup.builder().id("g1").title("Nhóm chỉ có bài tập").build();
        ContentGroup gVideoOnly = ContentGroup.builder().id("g2").title("Nhóm chỉ có video").build();
        ContentGroup gVocabOnly = ContentGroup.builder().id("g3").title("Nhóm từ vựng").build();

        ContentItem itemPractice = ContentItem.builder().id("it1").type("PRACTICE_TEST").build();
        ContentItem itemVideo = ContentItem.builder().id("it2").type("VIDEO_LECTURE").build();
        ContentItem itemVocab = ContentItem.builder().id("it3").type("VOCAB_SET").build();

        // 1. Nhóm chỉ có 1 hoạt động (chỉ có bài tập, không có video) -> ĐẠT CHUẨN
        ModerationContext ctxValid1 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .groups(List.of(gPracticeOnly))
                .itemsByGroup(Map.of("g1", List.of(itemPractice)))
                .build();
        assertTrue(rule.evaluate(ctxValid1).isEmpty());

        // 2. Nhóm chỉ có 1 hoạt động (chỉ có video, không có bài tập) -> ĐẠT CHUẨN
        ModerationContext ctxValid2 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .groups(List.of(gVideoOnly))
                .itemsByGroup(Map.of("g2", List.of(itemVideo)))
                .build();
        assertTrue(rule.evaluate(ctxValid2).isEmpty());

        // 3. Nhóm từ vựng chỉ có 1 hoạt động (VOCAB_SET) -> ĐẠT CHUẨN
        ModerationContext ctxValid3 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .groups(List.of(gVocabOnly))
                .itemsByGroup(Map.of("g3", List.of(itemVocab)))
                .build();
        assertTrue(rule.evaluate(ctxValid3).isEmpty());

        // 4. Nhóm để trống (0 hoạt động) -> BÁO LỖI BLOCKER
        ModerationContext ctxEmpty = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .groups(List.of(gEmpty))
                .itemsByGroup(Map.of("g0", List.of()))
                .build();
        List<RuleIssue> issuesEmpty = rule.evaluate(ctxEmpty);
        assertEquals(1, issuesEmpty.size());
        assertEquals("STR-08", issuesEmpty.get(0).getRuleId());
        assertEquals(Severity.BLOCKER, issuesEmpty.get(0).getSeverity());
        assertTrue(issuesEmpty.get(0).getMessage().contains("tối thiểu 1 hoạt động"));
    }

    @Test
    @DisplayName("STR-12: Chặn video bài giảng dưới 30 giây")
    void testStr12_VideoDuration() {
        Str12_VideoDurationRule rule = new Str12_VideoDurationRule();

        MediaAsset shortVideo = MediaAsset.builder().id("m1").durationSec(20).build();
        ContentItem it1 = ContentItem.builder().id("it1").title("Bài 1").type("VIDEO_LECTURE").videoMedia(shortVideo).build();

        ModerationContext ctx1 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .items(List.of(it1))
                .build();

        List<RuleIssue> issues1 = rule.evaluate(ctx1);
        assertEquals(1, issues1.size());
        assertEquals("STR-12", issues1.get(0).getRuleId());
        assertEquals(Severity.BLOCKER, issues1.get(0).getSeverity());

        // Video 30s đạt chuẩn
        MediaAsset validVideo = MediaAsset.builder().id("m2").durationSec(30).build();
        ContentItem it2 = ContentItem.builder().id("it2").title("Bài 2").type("VIDEO_LECTURE").videoMedia(validVideo).build();
        ModerationContext ctx2 = ModerationContext.builder()
                .course(Course.builder().id("c1").build())
                .items(List.of(it2))
                .build();

        assertTrue(rule.evaluate(ctx2).isEmpty());
    }
}
