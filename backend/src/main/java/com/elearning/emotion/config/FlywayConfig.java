package com.elearning.emotion.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình Flyway Migration Strategy:
 * - Tự động gọi flyway.repair() trước khi migrate để xóa bản ghi migration bị lỗi (nếu có),
 *   giúp hệ thống tự phục hồi mà không cần can thiệp thủ công vào bảng flyway_schema_history.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
