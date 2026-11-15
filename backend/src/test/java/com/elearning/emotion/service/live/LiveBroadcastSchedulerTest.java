package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.LessonLiveDto;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.mockito.Mockito.*;

class LiveBroadcastSchedulerTest {

    private LiveStreamRegistry streamRegistry;
    private LiveMetricsService metricsService;
    private ObjectMapper objectMapper;
    private LiveBroadcastScheduler scheduler;

    @BeforeEach
    void setUp() {
        streamRegistry = mock(LiveStreamRegistry.class);
        metricsService = mock(LiveMetricsService.class);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        scheduler = new LiveBroadcastScheduler(streamRegistry, metricsService, objectMapper);
    }

    @Test
    @DisplayName("Không thực hiện broadcast khi không có giảng viên nào kết nối")
    void testNoOpWhenNoActiveTeachers() {
        when(streamRegistry.getActiveTeacherIds()).thenReturn(Collections.emptySet());

        scheduler.broadcastSnapshots();

        verify(metricsService, never()).buildSnapshot(anyString());
        verify(streamRegistry, never()).broadcastSnapshot(anyString(), any());
    }

    @Test
    @DisplayName("Broadcast khi có giảng viên kết nối và dữ liệu thay đổi")
    void testBroadcastSnapshotWhenPayloadChanged() {
        String teacherId = "teacher-1";
        when(streamRegistry.getActiveTeacherIds()).thenReturn(Set.of(teacherId));

        LiveSnapshotDto snap1 = new LiveSnapshotDto(
                java.time.LocalDateTime.now(),
                List.of(new LessonLiveDto("item-1", "Lesson 1", 3, java.util.Map.of("ENGAGED", 2), List.of(), null))
        );

        when(metricsService.buildSnapshot(teacherId)).thenReturn(snap1);

        scheduler.broadcastSnapshots();

        verify(streamRegistry, times(1)).broadcastSnapshot(eq(teacherId), eq(snap1));
    }

    @Test
    @DisplayName("Bỏ qua broadcast nếu payload không thay đổi và chưa tới 15 giây")
    void testSkipBroadcastWhenPayloadUnchangedWithin15s() {
        String teacherId = "teacher-1";
        when(streamRegistry.getActiveTeacherIds()).thenReturn(Set.of(teacherId));

        LiveSnapshotDto snap1 = new LiveSnapshotDto(
                java.time.LocalDateTime.now(),
                List.of(new LessonLiveDto("item-1", "Lesson 1", 3, java.util.Map.of("ENGAGED", 2), List.of(), null))
        );

        when(metricsService.buildSnapshot(teacherId)).thenReturn(snap1);

        // Lần 1: Có phát
        scheduler.broadcastSnapshots();
        verify(streamRegistry, times(1)).broadcastSnapshot(eq(teacherId), any());

        // Lần 2 ngay sau đó: Payload giống hệt -> không phát lần 2
        scheduler.broadcastSnapshots();
        verify(streamRegistry, times(1)).broadcastSnapshot(eq(teacherId), any());
    }

    @Test
    @DisplayName("Gọi registry.sendHeartbeat khi scheduler heartbeat chạy")
    void testSendHeartbeat() {
        scheduler.sendHeartbeat();
        verify(streamRegistry, times(1)).sendHeartbeat();
    }
}
