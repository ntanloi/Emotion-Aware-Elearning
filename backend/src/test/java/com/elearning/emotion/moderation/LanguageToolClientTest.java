package com.elearning.emotion.moderation;

import com.elearning.emotion.moderation.client.HttpLanguageToolClient;
import com.elearning.emotion.moderation.client.LanguageToolMatchDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LanguageToolClientTest {

    @Test
    @DisplayName("LanguageTool: Kích hoạt chế độ chịu lỗi (Graceful degradation) khi server tắt")
    void testGracefulDegradationWhenServerDown() {
        // Cổng 59999 không có dịch vụ nào chạy
        HttpLanguageToolClient client = new HttpLanguageToolClient(
                "http://localhost:59999/v2/check",
                true,
                500, // Timeout ngắn 500ms
                new ObjectMapper()
        );

        // Gọi kiểm tra câu tiếng Anh
        List<LanguageToolMatchDto> matches = client.checkText("This is an test sentence with error.", "en-US");

        // Không ném ngoại lệ làm chết ứng dụng, trả về danh sách rỗng
        assertNotNull(matches);
        assertTrue(matches.isEmpty());
        assertFalse(client.isAvailable());
    }

    @Test
    @DisplayName("LanguageTool: Bỏ qua khi cấu hình enabled=false")
    void testDisabledClient() {
        HttpLanguageToolClient client = new HttpLanguageToolClient(
                "http://localhost:8010/v2/check",
                false,
                1000,
                new ObjectMapper()
        );

        List<LanguageToolMatchDto> matches = client.checkText("This is a test.", "en-US");
        assertNotNull(matches);
        assertTrue(matches.isEmpty());
        assertFalse(client.isAvailable());
    }
}
