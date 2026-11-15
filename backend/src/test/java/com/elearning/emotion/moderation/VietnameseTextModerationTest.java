package com.elearning.emotion.moderation;

import com.elearning.emotion.entity.ModerationLexicon;
import com.elearning.emotion.repository.ModerationLexiconRepository;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.elearning.emotion.service.LexiconService;
import com.elearning.emotion.util.TextNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VietnameseTextModerationTest {

    @Mock
    private ModerationLexiconRepository lexiconRepository;

    private LexiconService lexiconService;
    private HtmlSanitizerService htmlSanitizerService;

    @BeforeEach
    void setUp() {
        lexiconService = new LexiconService(lexiconRepository);
        htmlSanitizerService = new HtmlSanitizerService();

        // Chuẩn bị danh sách từ điển mẫu chuẩn cho test
        List<ModerationLexicon> mockLexicons = Arrays.asList(
                ModerationLexicon.builder()
                        .id("1")
                        .category("PROFANITY_VI")
                        .matchType("WORD")
                        .pattern("cặc")
                        .severity("ERROR")
                        .scope("ALL")
                        .active(true)
                        .build(),
                ModerationLexicon.builder()
                        .id("2")
                        .category("PROFANITY_VI")
                        .matchType("WORD")
                        .pattern("đm")
                        .severity("WARNING")
                        .scope("ALL")
                        .active(true)
                        .build(),
                ModerationLexicon.builder()
                        .id("3")
                        .category("PROFANITY_EN")
                        .matchType("WORD")
                        .pattern("fuck")
                        .severity("ERROR")
                        .scope("ALL")
                        .active(true)
                        .build(),
                ModerationLexicon.builder()
                        .id("4")
                        .category("PROFANITY_EN")
                        .matchType("WORD")
                        .pattern("ass")
                        .severity("CONTEXT")
                        .scope("ALL")
                        .active(true)
                        .build(),
                ModerationLexicon.builder()
                        .id("5")
                        .category("INSULT_VI")
                        .matchType("WORD")
                        .pattern("chó")
                        .severity("CONTEXT")
                        .scope("ALL")
                        .active(true)
                        .build()
        );

        when(lexiconRepository.findByActiveTrue()).thenReturn(mockLexicons);
        lexiconService.reloadCache();
    }

    @Test
    @DisplayName("SPEC Mục 5: Từ 'các' trong tiếng Việt KHÔNG khớp từ tục 'cặc'")
    void testVietnameseCacNotMatchingCac() {
        String safeText = "Chào mừng các bạn học sinh đến với khóa học luyện thi TOEIC.";
        List<LexiconService.LexiconMatch> matches = lexiconService.scan(safeText, "ALL");

        assertTrue(matches.isEmpty(), "Từ 'các' tuyệt đối không được khớp với từ tục 'cặc'");
    }

    @Test
    @DisplayName("SPEC Mục 5: Từ tiếng Anh 'class' KHÔNG khớp với từ tục 'ass'")
    void testClassNotMatchingAss() {
        String safeText = "Welcome to our English online class today.";
        List<LexiconService.LexiconMatch> matches = lexiconService.scan(safeText, "ALL");

        assertTrue(matches.isEmpty(), "Từ 'class' không được khớp nhầm chuỗi con 'ass'");
    }

    @Test
    @DisplayName("SPEC Mục 5: Chuẩn hóa chống lách luật bắt được 'f u c k' và 'đ.m'")
    void testDeobfuscatedProfanityCaught() {
        // 1. Phân tách bằng khoảng trắng giữa các chữ cái đơn lẻ
        String spacedFuck = "This is f u c k you";
        List<LexiconService.LexiconMatch> matches1 = lexiconService.scan(spacedFuck, "ALL");
        assertFalse(matches1.isEmpty());
        assertTrue(matches1.stream().anyMatch(m -> "fuck".equalsIgnoreCase(m.getMatchedWord())));

        // 2. Chen dấu chấm giữa các chữ cái
        String dottedDm = "Nói chuyện như con đ.m";
        List<LexiconService.LexiconMatch> matches2 = lexiconService.scan(dottedDm, "ALL");
        assertFalse(matches2.isEmpty());
        assertTrue(matches2.stream().anyMatch(m -> "đm".equalsIgnoreCase(m.getMatchedWord())));

        // 3. Phân tách bằng dấu cách 'đ m'
        String spacedDm = "Cái đồ đ m";
        List<LexiconService.LexiconMatch> matches3 = lexiconService.scan(spacedDm, "ALL");
        assertFalse(matches3.isEmpty());
        assertTrue(matches3.stream().anyMatch(m -> "đm".equalsIgnoreCase(m.getMatchedWord())));
    }

    @Test
    @DisplayName("SPEC Mục 5: Mức CONTEXT ('chó' trong 'dog') KHÔNG tự tạo lỗi khi quét thông thường")
    void testContextSeverityDoesNotProduceErrors() {
        String vocabDogMeaning = "Con chó là loài động vật trung thành";
        List<LexiconService.LexiconMatch> matches = lexiconService.scan(vocabDogMeaning, "ALL");

        assertTrue(matches.isEmpty(), "Mức CONTEXT không được tự động tạo lỗi vi phạm");

        // Nhưng nếu quét kèm includeContext=true (dành cho tầng LLM AI-06) thì vẫn phát hiện
        List<LexiconService.LexiconMatch> contextMatches = lexiconService.scan(vocabDogMeaning, "ALL", true);
        assertEquals(1, contextMatches.size());
        assertEquals("CONTEXT", contextMatches.get(0).getSeverity());
        assertEquals("INSULT_VI", contextMatches.get(0).getCategory());
    }

    @Test
    @DisplayName("SPEC Mục 5: Khử mã độc HTML khi lưu nội dung rich text")
    void testHtmlSanitization() {
        String maliciousHtml = "<p>Nội dung bài giảng hợp lệ.</p><script>alert('hack');</script><a href=\"javascript:evil()\">Nhấn vào đây</a>";
        String cleanHtml = htmlSanitizerService.sanitize(maliciousHtml);

        assertFalse(cleanHtml.contains("<script>"), "Thẻ script độc hại phải bị loại bỏ");
        assertFalse(cleanHtml.contains("javascript:"), "Giao thức javascript: phải bị loại bỏ");
        assertTrue(cleanHtml.contains("<p>Nội dung bài giảng hợp lệ.</p>"), "Các thẻ HTML văn bản an toàn phải được giữ nguyên");
    }

    @Test
    @DisplayName("TextNormalizer: Kiểm tra containsWord theo ranh giới từ")
    void testContainsWord() {
        assertTrue(TextNormalizer.containsWord("học bài tại class hôm nay", "class"));
        assertFalse(TextNormalizer.containsWord("học bài tại class hôm nay", "ass"));
        assertTrue(TextNormalizer.containsWord("học sinh làm bài tập", "sinh"));
        assertFalse(TextNormalizer.containsWord("học sinh làm bài tập", "các"));
    }
}
