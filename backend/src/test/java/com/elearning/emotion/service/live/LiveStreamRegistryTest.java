package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.LiveAlertEventDto;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LiveStreamRegistryTest {

    private LiveStreamRegistry registry;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        registry = new LiveStreamRegistry(objectMapper);
    }

    @Test
    @DisplayName("Giới hạn tối đa 3 kết nối đồng thời cho mỗi giảng viên (đóng emitter cũ nhất)")
    void testMaxConnectionsLimit() {
        String teacherId = "teacher-123";
        SseEmitter e1 = Mockito.spy(new SseEmitter(10000L));
        SseEmitter e2 = Mockito.spy(new SseEmitter(10000L));
        SseEmitter e3 = Mockito.spy(new SseEmitter(10000L));
        SseEmitter e4 = Mockito.spy(new SseEmitter(10000L));

        registry.registerEmitter(teacherId, e1);
        registry.registerEmitter(teacherId, e2);
        registry.registerEmitter(teacherId, e3);

        assertEquals(3, registry.getActiveConnectionCount(teacherId));

        // Thêm emitter thứ 4: một trong các emitter cũ phải bị gọi complete()
        registry.registerEmitter(teacherId, e4);

        assertEquals(3, registry.getActiveConnectionCount(teacherId));
        boolean oneCompleted = Mockito.mockingDetails(e1).getInvocations().stream().anyMatch(i -> i.getMethod().getName().equals("complete"))
                || Mockito.mockingDetails(e2).getInvocations().stream().anyMatch(i -> i.getMethod().getName().equals("complete"))
                || Mockito.mockingDetails(e3).getInvocations().stream().anyMatch(i -> i.getMethod().getName().equals("complete"));
        assertTrue(oneCompleted, "Phải có ít nhất 1 emitter cũ bị đóng complete() khi vượt quá giới hạn");
    }

    @Test
    @DisplayName("Dọn dẹp emitter khi completion hoặc chủ động gỡ bỏ")
    void testRemoveEmitter() {
        String teacherId = "teacher-456";
        SseEmitter emitter = new SseEmitter(10000L);

        registry.registerEmitter(teacherId, emitter);
        assertEquals(1, registry.getActiveConnectionCount(teacherId));
        assertTrue(registry.getActiveTeacherIds().contains(teacherId));

        registry.removeEmitter(teacherId, emitter);
        assertEquals(0, registry.getActiveConnectionCount(teacherId));
        assertFalse(registry.getActiveTeacherIds().contains(teacherId));
    }

    @Test
    @DisplayName("Broadcast snapshot tới giảng viên đang kết nối và gán event ID")
    void testBroadcastSnapshot() throws IOException {
        String teacherId = "teacher-789";
        SseEmitter mockEmitter = mock(SseEmitter.class);

        registry.registerEmitter(teacherId, mockEmitter);

        LiveSnapshotDto snapshot = new LiveSnapshotDto(java.time.LocalDateTime.now(), List.of());
        registry.broadcastSnapshot(teacherId, snapshot);

        // Phải gửi ít nhất 1 sự kiện qua emitter
        verify(mockEmitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Dọn dẹp emitter chết khi gửi snapshot ném IOException")
    void testDeadEmitterCleanupOnSnapshot() throws IOException {
        String teacherId = "teacher-dead";
        SseEmitter faultyEmitter = mock(SseEmitter.class);
        doThrow(new IOException("Broken pipe")).when(faultyEmitter).send(any(SseEmitter.SseEventBuilder.class));

        registry.registerEmitter(teacherId, faultyEmitter);
        assertEquals(1, registry.getActiveConnectionCount(teacherId));

        LiveSnapshotDto snapshot = new LiveSnapshotDto(java.time.LocalDateTime.now(), List.of());
        registry.broadcastSnapshot(teacherId, snapshot);

        // Sau khi ném lỗi, emitter bị remove
        assertEquals(0, registry.getActiveConnectionCount(teacherId));
    }

    @Test
    @DisplayName("Broadcast alert tới giảng viên")
    void testBroadcastAlert() throws IOException {
        String teacherId = "teacher-alert";
        SseEmitter mockEmitter = mock(SseEmitter.class);

        registry.registerEmitter(teacherId, mockEmitter);

        LiveAlertEventDto alert = new LiveAlertEventDto(
                "alert-1", "item-1", "Lesson 1", 30, 45, 0.45, 5
        );
        registry.broadcastAlert(teacherId, alert);

        verify(mockEmitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Gửi heartbeat ping comment định kỳ")
    void testSendHeartbeat() throws IOException {
        String teacherId = "teacher-hb";
        SseEmitter mockEmitter = mock(SseEmitter.class);

        registry.registerEmitter(teacherId, mockEmitter);
        registry.sendHeartbeat();

        verify(mockEmitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }
}
