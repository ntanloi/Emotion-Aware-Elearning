package com.elearning.emotion.config;

import com.elearning.emotion.entity.Role;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@elearning.vn}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@123456}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByRole(Role.ADMIN.name())) {
            if (userRepository.existsByEmail(adminEmail)) {
                log.warn("Email admin {} đã tồn tại với role khác. Vui lòng kiểm tra lại cấu hình.", adminEmail);
                return;
            }
            User admin = User.builder()
                    .fullName("Quản trị viên Hệ thống")
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN.name())
                    .build();
            userRepository.save(admin);
            log.info("Khởi tạo tài khoản ADMIN mặc định thành công: email={}", adminEmail);
        }
    }
}
