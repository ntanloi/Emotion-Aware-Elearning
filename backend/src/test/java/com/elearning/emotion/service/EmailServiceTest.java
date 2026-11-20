package com.elearning.emotion.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailServiceTest {

    @Test
    void testSendRegisterOtpEmail_WithoutConfiguredBrevo_ReturnsFalseGracefully() {
        EmailService emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "");
        ReflectionTestUtils.setField(emailService, "brevoSenderEmail", "");

        boolean result = emailService.sendRegisterOtpEmail("test@gmail.com", "Học viên", "123456");

        // Chưa cấu hình Brevo: trả về false một cách an toàn, không làm sập ứng dụng
        assertFalse(result);
    }

    @Test
    void testSendResetPasswordOtpEmail_WithoutConfiguredBrevo_ReturnsFalseGracefully() {
        EmailService emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "");
        ReflectionTestUtils.setField(emailService, "brevoSenderEmail", "");

        assertFalse(emailService.sendResetPasswordOtpEmail("test@gmail.com", "Học viên", "123456"));
    }

    @Test
    void testBuildRegisterOtpHtml_HasModernProMaxLayoutWithoutRawEmojis() {
        EmailService emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://testdeploy-weld-chi.vercel.app");

        String html = ReflectionTestUtils.invokeMethod(emailService, "buildRegisterOtpHtml", "Trần Lê Trường Vũ", "082830");
        assertNotNull(html);

        // Chứa tên và OTP
        assertTrue(html.contains("Trần Lê Trường Vũ"));
        assertTrue(html.contains("082830"));

        // Chứa URL icon retina chuyên nghiệp
        assertTrue(html.contains("logo-brand.png"));
        assertTrue(html.contains("icon-timer.png"));
        assertTrue(html.contains("icon-shield.png"));

        // Mã OTP là một khối chọn được cùng lúc + gợi ý sao chép (không chuyển trang)
        assertTrue(html.contains("icon-copy.png"));
        assertTrue(html.contains("user-select: all"));
        assertFalse(html.contains("/copy-otp"));
        assertFalse(html.contains("Sao chép nhanh"));

        // Không chứa raw emoji thiếu chuyên nghiệp
        assertFalse(html.contains("🎓"));
        assertFalse(html.contains("⏱"));
        assertFalse(html.contains("🔒"));
    }

    @Test
    void testBuildResetPasswordOtpHtml_HasModernProMaxLayoutWithoutRawEmojis() {
        EmailService emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://testdeploy-weld-chi.vercel.app");

        String html = ReflectionTestUtils.invokeMethod(emailService, "buildResetPasswordOtpHtml", "Lê Hoàng Nam", "654321");
        assertNotNull(html);

        assertTrue(html.contains("Lê Hoàng Nam"));
        assertTrue(html.contains("654321"));
        // Header dùng logo trang chủ (GraduationCap) giống web
        assertTrue(html.contains("logo-brand.png"));
        assertTrue(html.contains("icon-timer.png"));
        assertTrue(html.contains("icon-shield-alert.png"));

        // Mã OTP là một khối chọn được cùng lúc + gợi ý sao chép (không chuyển trang)
        assertTrue(html.contains("icon-copy.png"));
        assertTrue(html.contains("user-select: all"));
        assertFalse(html.contains("/copy-otp"));
        assertFalse(html.contains("Sao chép nhanh"));

        assertFalse(html.contains("🔐"));
        assertFalse(html.contains("⏱"));
        assertFalse(html.contains("🔒"));
    }
}
