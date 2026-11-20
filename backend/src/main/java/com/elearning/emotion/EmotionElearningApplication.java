package com.elearning.emotion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class EmotionElearningApplication {

    /** Múi giờ chuẩn của toàn hệ thống: mọi LocalDateTime/LocalDate.now() đều là giờ Việt Nam (UTC+7). */
    public static final String APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

    static {
        // Phải chạy trước khi Spring/Hibernate/Jackson khởi tạo; không phụ thuộc múi giờ của máy chủ/container
        // (Render, Docker... mặc định là UTC).
        TimeZone.setDefault(TimeZone.getTimeZone(APP_TIME_ZONE));
    }

    public static void main(String[] args) {
        SpringApplication.run(EmotionElearningApplication.class, args);
    }
}
