package com.elearning.emotion.service.realtime;

import com.elearning.emotion.config.RealtimeProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/**
 * RealtimePublisher — Cổng giao tiếp duy nhất để các service nghiệp vụ phát sự kiện Realtime.
 * Sự kiện được đẩy qua Spring ApplicationEvent để đảm bảo chỉ broadcast sau khi Transaction đã commit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimePublisher {

    private final RealtimeProperties realtimeProperties;
    private final RealtimeHub realtimeHub;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Gửi sự kiện đích danh cho một người dùng (tất cả các tab đang mở của user đó).
     */
    public void publishToUser(String userId, String type, Object data) {
        if (!realtimeProperties.isEnabled() || userId == null || type == null) return;
        RealtimeEvent event = new RealtimeEvent(realtimeHub.nextEventId(), type, data, userId, null);
        eventPublisher.publishEvent(new RealtimeAppEvent(this, event));
    }

    /**
     * Gửi sự kiện cho toàn bộ người dùng mang một vai trò (ví dụ: ADMIN, TEACHER).
     */
    public void publishToRole(String role, String type, Object data) {
        if (!realtimeProperties.isEnabled() || role == null || type == null) return;
        RealtimeEvent event = new RealtimeEvent(realtimeHub.nextEventId(), type, data, null, role);
        eventPublisher.publishEvent(new RealtimeAppEvent(this, event));
    }

    /**
     * Gửi sự kiện cho toàn bộ đội ngũ kiểm duyệt (ADMIN + MODERATOR).
     * Dùng cho các sự kiện thuộc nghiệp vụ kiểm duyệt (khóa học, đề thi, báo cáo đánh giá...).
     * Sự kiện tài chính vẫn chỉ gửi riêng cho ADMIN qua publishToRole("ADMIN", ...).
     */
    public void publishToModerationStaff(String type, Object data) {
        publishToRole("ADMIN", type, data);
        publishToRole("MODERATOR", type, data);
    }

    /**
     * Gửi broadcast toàn hệ thống cho mọi người dùng đang kết nối.
     */
    public void publishToAll(String type, Object data) {
        if (!realtimeProperties.isEnabled() || type == null) return;
        RealtimeEvent event = new RealtimeEvent(realtimeHub.nextEventId(), type, data, null, null);
        eventPublisher.publishEvent(new RealtimeAppEvent(this, event));
    }
}
