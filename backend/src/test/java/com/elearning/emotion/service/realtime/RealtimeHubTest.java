package com.elearning.emotion.service.realtime;

import com.elearning.emotion.config.RealtimeProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RealtimeHubTest {

    private RealtimeHub realtimeHub;
    private RealtimeProperties properties;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        properties = new RealtimeProperties();
        properties.setMaxConnectionsPerUser(5);
        properties.setReplayBufferSize(50);
        properties.setEnabled(true);

        objectMapper = new ObjectMapper();
        realtimeHub = new RealtimeHub(properties, objectMapper);
    }

    @Test
    @DisplayName("Giới hạn tối đa 5 kết nối cho mỗi user, đóng kết nối cũ nhất khi vượt quá")
    void testMaxConnectionsPerUser() {
        String userId = "user-tab-test";
        SseEmitter[] emitters = new SseEmitter[6];
        for (int i = 0; i < 6; i++) {
            emitters[i] = Mockito.spy(new SseEmitter(10000L));
            realtimeHub.register(userId, "STUDENT", emitters[i], null);
        }

        assertEquals(5, realtimeHub.getConnectionCount(userId));
        // Emitter đầu tiên bị đóng
        verify(emitters[0], atLeastOnce()).complete();
    }

    @Test
    @DisplayName("Dispatch sự kiện tới đúng đích danh userId")
    void testDispatchToSpecificUser() throws IOException {
        String userA = "user-A";
        String userB = "user-B";

        SseEmitter emitterA = mock(SseEmitter.class);
        SseEmitter emitterB = mock(SseEmitter.class);

        realtimeHub.register(userA, "STUDENT", emitterA, null);
        realtimeHub.register(userB, "STUDENT", emitterB, null);

        RealtimeEvent event = new RealtimeEvent(
                realtimeHub.nextEventId(),
                "notification",
                Map.of("msg", "Chào bạn"),
                userA,
                null
        );

        realtimeHub.dispatch(event);

        verify(emitterA, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(emitterB, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Dispatch sự kiện tới role (ADMIN) chỉ gửi cho tài khoản ADMIN")
    void testDispatchToRole() throws IOException {
        String adminUser = "admin-1";
        String studentUser = "student-1";

        SseEmitter emitterAdmin = mock(SseEmitter.class);
        SseEmitter emitterStudent = mock(SseEmitter.class);

        realtimeHub.register(adminUser, "ADMIN", emitterAdmin, null);
        realtimeHub.register(studentUser, "STUDENT", emitterStudent, null);

        RealtimeEvent event = new RealtimeEvent(
                realtimeHub.nextEventId(),
                "admin-stats",
                Map.of("pending", 5),
                null,
                "ADMIN"
        );

        realtimeHub.dispatch(event);

        verify(emitterAdmin, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(emitterStudent, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Replay các sự kiện bị lỡ khi client reconnect kèm Last-Event-ID")
    void testReplayMissedEvents() throws IOException {
        String userId = "user-replay";

        // Phát trước 3 sự kiện
        RealtimeEvent ev1 = new RealtimeEvent("1", "notification", Map.of("step", 1), userId, null);
        RealtimeEvent ev2 = new RealtimeEvent("2", "notification", Map.of("step", 2), userId, null);
        RealtimeEvent ev3 = new RealtimeEvent("3", "notification", Map.of("step", 3), userId, null);

        realtimeHub.dispatch(ev1);
        realtimeHub.dispatch(ev2);
        realtimeHub.dispatch(ev3);

        // Client reconnect với Last-Event-ID = "1" -> phải nhận lại ev2 và ev3
        SseEmitter emitter = mock(SseEmitter.class);
        realtimeHub.register(userId, "STUDENT", emitter, "1");

        verify(emitter, times(2)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Heartbeat gửi comment ping cho toàn bộ emitter đang mở")
    void testSendHeartbeat() throws IOException {
        SseEmitter e1 = mock(SseEmitter.class);
        SseEmitter e2 = mock(SseEmitter.class);

        realtimeHub.register("u1", "STUDENT", e1, null);
        realtimeHub.register("u2", "TEACHER", e2, null);

        realtimeHub.sendHeartbeat();

        verify(e1, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(e2, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }
}
