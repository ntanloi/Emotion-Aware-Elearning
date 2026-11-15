package com.elearning.emotion.service.realtime;

/**
 * Đại diện cho một sự kiện Realtime gửi qua kênh SSE dùng chung.
 *
 * @param eventId      ID tuần tự của sự kiện (dùng cho Last-Event-ID)
 * @param type         Loại sự kiện (notification, payment, admin-stats, moderation-run, course-status, ...)
 * @param data         Dữ liệu đính kèm (DTO hoặc Map, có thể rỗng nếu chỉ là tín hiệu invalidate)
 * @param targetUserId ID người dùng nhận đích (null nếu gửi cho cả role hoặc toàn bộ)
 * @param targetRole   Role người dùng nhận đích (ADMIN, TEACHER, STUDENT - null nếu gửi cho user đích hoặc toàn bộ)
 * @param timestamp    Thời điểm phát sự kiện (epoch ms)
 */
public record RealtimeEvent(
        String eventId,
        String type,
        Object data,
        String targetUserId,
        String targetRole,
        long timestamp
) {
    public RealtimeEvent(String eventId, String type, Object data, String targetUserId, String targetRole) {
        this(eventId, type, data, targetUserId, targetRole, System.currentTimeMillis());
    }
}
