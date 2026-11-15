package com.elearning.emotion.controller;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.service.emotion.SessionSlidingWindowCache;
import com.elearning.emotion.service.live.LiveMetricsService;
import com.elearning.emotion.service.live.LiveStreamRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherLiveControllerTest {

    @Mock
    private LiveStreamRegistry liveStreamRegistry;
    @Mock
    private LiveMetricsService liveMetricsService;
    @Mock
    private SessionSlidingWindowCache slidingWindowCache;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private EmotionAlertProperties alertProperties;
    @Mock
    private HttpServletResponse response;

    private ObjectMapper objectMapper;
    private TeacherLiveController controller;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        controller = new TeacherLiveController(
                liveStreamRegistry,
                liveMetricsService,
                slidingWindowCache,
                contentItemRepository,
                alertProperties,
                objectMapper
        );
    }

    @Test
    @DisplayName("streamLiveClass: Thiết lập header và đăng ký emitter vào registry")
    void testStreamLiveClass() {
        String teacherId = "teacher-123";

        SseEmitter emitter = controller.streamLiveClass(teacherId, response);

        assertNotNull(emitter);
        verify(response).setHeader("Cache-Control", "no-cache, no-transform");
        verify(response).setHeader("X-Accel-Buffering", "no");
        verify(liveStreamRegistry).registerEmitter(eq(teacherId), any(SseEmitter.class));
    }

    @Test
    @DisplayName("getSnapshot: Trả về snapshot dữ liệu hiện tại")
    void testGetSnapshot() {
        String teacherId = "teacher-123";
        LiveSnapshotDto mockSnapshot = new LiveSnapshotDto(java.time.LocalDateTime.now(), List.of());
        when(liveMetricsService.buildSnapshot(teacherId)).thenReturn(mockSnapshot);

        ResponseEntity<LiveSnapshotDto> res = controller.getSnapshot(teacherId);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(mockSnapshot, res.getBody());
        verify(liveMetricsService).buildSnapshot(teacherId);
    }

    @Test
    @DisplayName("seedDemoViewers: Trả về 400 nếu tính năng demoSeed bị tắt trong cấu hình")
    void testSeedDemoViewersWhenDisabled() {
        when(alertProperties.isDemoSeedEnabled()).thenReturn(false);

        ResponseEntity<Map<String, Object>> res = controller.seedDemoViewers("teacher-123", 5);

        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().containsKey("message"));
    }
}
