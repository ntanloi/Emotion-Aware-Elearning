package com.elearning.emotion.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;

class EmailServiceTest {

    @Test
    void testSendRegisterOtpEmail_WithoutConfiguredCredentials_ReturnsFalseGracefully() {
        EmailService emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "username", "");
        ReflectionTestUtils.setField(emailService, "password", "");

        boolean result = emailService.sendRegisterOtpEmail("test@gmail.com", "Học viên", "123456");

        // Khi chưa cấu hình Gmail SMTP, hàm ghi log mã OTP và trả về false một cách an toàn mà không làm sập ứng dụng
        assertFalse(result);
    }
}
