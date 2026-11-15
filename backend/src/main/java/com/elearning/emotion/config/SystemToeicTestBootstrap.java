package com.elearning.emotion.config;

import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.ToeicTestRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.service.SystemToeicTestSeederService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class SystemToeicTestBootstrap implements CommandLineRunner {

    private final ToeicTestRepository toeicTestRepository;
    private final UserRepository userRepository;
    private final SystemToeicTestSeederService systemToeicTestSeederService;

    @Override
    public void run(String... args) {
        long systemCount = toeicTestRepository.countBySource("SYSTEM");
        if (systemCount == 0) {
            userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                    .findFirst()
                    .ifPresent(admin -> {
                        log.info("Chưa có đề thi Hệ thống nào. Đang tự động khởi tạo 5 đề thi Hệ thống mẫu chuẩn ETS TOEIC...");
                        try {
                            systemToeicTestSeederService.seedSystemTests(admin.getId());
                            log.info("Khởi tạo hoàn tất các đề thi Hệ thống mẫu!");
                        } catch (Exception e) {
                            log.error("Lỗi khi khởi tạo đề thi Hệ thống mẫu: {}", e.getMessage(), e);
                        }
                    });
        }
    }
}
