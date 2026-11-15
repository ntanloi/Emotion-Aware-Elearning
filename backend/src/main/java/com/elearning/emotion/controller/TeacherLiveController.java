package com.elearning.emotion.controller;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.service.emotion.SessionSlidingWindowCache;
import com.elearning.emotion.service.live.LiveMetricsService;
import com.elearning.emotion.service.live.LiveStreamRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/teacher/live")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@Slf4j
public class TeacherLiveController {

    private final LiveStreamRegistry liveStreamRegistry;
    private final LiveMetricsService liveMetricsService;
    private final SessionSlidingWindowCache slidingWindowCache;
    private final ContentItemRepository contentItemRepository;
    private final EmotionAlertProperties alertProperties;
    private final ObjectMapper objectMapper;

    /**
     * SSE Stream: Cung cấp luồng dữ liệu thời gian thực cho màn hình theo dõi của giảng viên.
     * Timeout 30 phút, phát snapshot ngay khi vừa mở kết nối.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLiveClass(
            @AuthenticationPrincipal String userId,
            HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");

        // Timeout 30 phút để kiểm tra lại JWT định kỳ
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        liveStreamRegistry.registerEmitter(userId, emitter);

        // Gửi snapshot ban đầu bất đồng bộ để Spring MVC hoàn tất việc trả về emitter và thiết lập AsyncContext với Tomcat
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(100);
                LiveSnapshotDto initial = liveMetricsService.buildSnapshot(userId);
                liveStreamRegistry.broadcastSnapshot(userId, initial);
            } catch (Exception e) {
                log.debug("[TeacherLiveController] Kết nối khởi tạo đã đóng hoặc gặp lỗi cho giảng viên {}: {}", userId, e.getMessage());
            }
        });

        return emitter;
    }

    /**
     * Fallback Endpoint: Lấy snapshot tức thời bằng JSON phục vụ trường hợp polling dự phòng.
     */
    @GetMapping("/snapshot")
    public ResponseEntity<LiveSnapshotDto> getSnapshot(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(liveMetricsService.buildSnapshot(userId));
    }

    /**
     * Dev-only: Tạo các phiên học viên giả lập đang học trong RAM để kiểm thử trực quan luồng Live.
     */
    @PostMapping("/demo-viewers")
    public ResponseEntity<Map<String, Object>> seedDemoViewers(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "5") int count
    ) {
        if (!alertProperties.isDemoSeedEnabled()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chế độ demoSeed chưa được bật"));
        }

        List<ContentItem> items = contentItemRepository.findByTeacherIdAndType(userId, "VIDEO_LECTURE");
        if (items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bạn chưa có bài giảng VIDEO_LECTURE nào"));
        }

        ContentItem item = items.get(0);
        String courseId = item.getCourse() != null ? item.getCourse().getId() : null;

        String[] sampleStates = {"ENGAGED", "INTERESTED", "CONFUSED", "BORED", "ENGAGED", "CONFUSED"};
        Random random = new Random();

        int seeded = 0;
        for (int i = 1; i <= count; i++) {
            String fakeSessionId = "demo-live-" + userId.substring(0, Math.min(8, userId.length())) + "-" + i;
            String fakeUserId = "fake-user-" + i;

            var mem = slidingWindowCache.getOrCreate(fakeSessionId);
            mem.initMetadata(fakeSessionId, fakeUserId, item.getId(), courseId, userId, "LEARNING");
            slidingWindowCache.registerTeacherSession(userId, fakeSessionId);

            // Bổ sung các khung hình giả lập
            float videoSec = 120f + random.nextInt(60);
            for (int f = 0; f < 10; f++) {
                String state = (i == 3) ? "CONFUSED" : (i == 4) ? "BORED" : sampleStates[random.nextInt(sampleStates.length)];
                mem.addFrame(state, videoSec + f);
            }
            seeded++;
        }

        // Kích hoạt ngay snapshot
        LiveSnapshotDto snapshot = liveMetricsService.buildSnapshot(userId);
        liveStreamRegistry.broadcastSnapshot(userId, snapshot);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã tạo " + seeded + " học viên giả lập đang học bài: " + item.getTitle(),
                "viewers", seeded
        ));
    }
}
