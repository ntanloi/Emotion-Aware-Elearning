package com.elearning.emotion.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình hệ thống Server-Sent Events (SSE) Realtime đa kênh dùng chung.
 */
@Configuration
@ConfigurationProperties(prefix = "app.realtime")
@Data
public class RealtimeProperties {
    /**
     * Bật / tắt toàn bộ hệ thống SSE dùng chung.
     * Khi tắt, controller trả về 503 / disabled và client sẽ dùng polling dự phòng.
     */
    private boolean enabled = true;

    /**
     * Số kết nối đồng thời tối đa cho mỗi user (hỗ trợ nhiều tab).
     */
    private int maxConnectionsPerUser = 5;

    /**
     * Chu kỳ gửi comment SSE ": ping" để giữ kết nối không bị timeout/proxy ngắt (giây).
     */
    private int heartbeatIntervalSeconds = 20;

    /**
     * Kích thước bộ đệm lưu sự kiện gần nhất cho mỗi user/role phục vụ Last-Event-ID replay.
     */
    private int replayBufferSize = 50;

    /**
     * Thời gian timeout của SseEmitter (phút).
     */
    private int timeoutMinutes = 30;
}
