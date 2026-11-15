package com.elearning.emotion.controller;

import com.elearning.emotion.config.RealtimeProperties;
import com.elearning.emotion.service.realtime.RealtimeHub;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * RealtimeController — Endpoint kết nối SSE dùng chung cho toàn bộ ứng dụng.
 * Mỗi tab trình duyệt chỉ cần duy trì đúng một kết nối tới /api/realtime/stream.
 */
@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
@Slf4j
public class RealtimeController {

    private final RealtimeProperties realtimeProperties;
    private final RealtimeHub realtimeHub;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @AuthenticationPrincipal String userId,
            Authentication authentication,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId,
            HttpServletResponse response
    ) throws IOException {
        if (!realtimeProperties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Kênh Realtime SSE tạm thời tắt");
        }

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }

        // Tối ưu proxy và Nginx buffering
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");

        String role = "";
        if (authentication != null && authentication.getAuthorities() != null) {
            role = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                    .findFirst()
                    .orElse("");
        }

        long timeoutMs = realtimeProperties.getTimeoutMinutes() * 60 * 1000L;
        SseEmitter emitter = new SseEmitter(timeoutMs);

        realtimeHub.register(userId, role, emitter, lastEventId);
        log.debug("[RealtimeController] Đã mở luồng SSE cho user {} (role={})", userId, role);

        // Gửi gói event initial 'connected' để flush HTTP response headers ngay lập tức xuống client
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"status\":\"OK\",\"userId\":\"" + userId + "\"}", MediaType.APPLICATION_JSON));
        } catch (Exception ex) {
            log.debug("[RealtimeController] Client ngắt kết nối trước khi nhận initial event: {}", ex.getMessage());
            try {
                emitter.complete();
            } catch (Exception ignored) {}
        }

        return emitter;
    }
}
