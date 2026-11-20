package com.elearning.emotion.service.realtime;

import com.elearning.emotion.config.RealtimeProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * RealtimeHub — Trung tâm quản lý các kết nối SSE dùng chung và định tuyến sự kiện.
 * - Quản lý kết nối theo từng userId, hỗ trợ đa tab (tối đa maxConnectionsPerUser kết nối/user).
 * - Bộ đệm replay 50 sự kiện gần nhất hỗ trợ Last-Event-ID khi client reconnect.
 * - Định kỳ gửi heartbeat comment ": ping" để duy trì kết nối xuyên qua Nginx / Proxy.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeHub {

    public record UserConnection(
            String connectionId,
            String userId,
            String role,
            SseEmitter emitter,
            long connectedAt
    ) {}

    private final RealtimeProperties realtimeProperties;
    private final ObjectMapper objectMapper;

    private final Map<String, Set<UserConnection>> userConnections = new ConcurrentHashMap<>();
    private final Deque<RealtimeEvent> replayBuffer = new ConcurrentLinkedDeque<>();
    private final AtomicLong eventSequence = new AtomicLong(0);

    public String nextEventId() {
        return String.valueOf(eventSequence.incrementAndGet());
    }

    /**
     * Đăng ký kết nối SSE mới của người dùng.
     */
    public void register(String userId, String role, SseEmitter emitter, String lastEventId) {
        if (userId == null || emitter == null) return;

        String connId = UUID.randomUUID().toString();
        UserConnection newConn = new UserConnection(connId, userId, role, emitter, System.currentTimeMillis());

        Set<UserConnection> connections = userConnections.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());

        synchronized (connections) {
            int maxAllowed = realtimeProperties.getMaxConnectionsPerUser();
            if (connections.size() >= maxAllowed) {
                // Đóng kết nối cũ nhất
                UserConnection oldest = null;
                for (UserConnection c : connections) {
                    if (oldest == null || c.connectedAt() < oldest.connectedAt()) {
                        oldest = c;
                    }
                }
                if (oldest != null) {
                    try {
                        oldest.emitter().complete();
                    } catch (Exception ignored) {}
                    connections.remove(oldest);
                    log.debug("[RealtimeHub] User {} mở quá {} tab, đóng kết nối cũ {}", userId, maxAllowed, oldest.connectionId());
                }
            }
            connections.add(newConn);
        }

        emitter.onCompletion(() -> removeConnection(userId, newConn));
        emitter.onTimeout(() -> {
            log.debug("[RealtimeHub] Timeout kết nối {} của user {}", connId, userId);
            removeConnection(userId, newConn);
        });
        emitter.onError(ex -> {
            log.debug("[RealtimeHub] Lỗi kết nối {} của user {}: {}", connId, userId, ex.getMessage());
            removeConnection(userId, newConn);
        });

        // Nếu client cung cấp Last-Event-ID (reconnect sau khi mất mạng), phát lại các sự kiện bị lỡ
        if (lastEventId != null && !lastEventId.isBlank()) {
            replayMissedEvents(newConn, lastEventId);
        }
    }

    public void removeConnection(String userId, UserConnection conn) {
        if (userId == null || conn == null) return;
        try {
            conn.emitter().complete();
        } catch (Exception ignored) {}
        Set<UserConnection> connections = userConnections.get(userId);
        if (connections != null) {
            connections.remove(conn);
            if (connections.isEmpty()) {
                userConnections.computeIfPresent(userId, (k, s) -> s.isEmpty() ? null : s);
            }
        }
    }

    public int getConnectionCount(String userId) {
        Set<UserConnection> set = userConnections.get(userId);
        return set != null ? set.size() : 0;
    }

    public int getTotalConnectionCount() {
        return userConnections.values().stream().mapToInt(Set::size).sum();
    }

    /**
     * Định tuyến và phát sự kiện tới các client tương ứng.
     */
    public void dispatch(RealtimeEvent event) {
        if (event == null) return;

        // Lưu vào bộ đệm replay
        addToReplayBuffer(event);

        String payloadJson;
        try {
            payloadJson = event.data() != null ? objectMapper.writeValueAsString(event.data()) : "{}";
        } catch (Exception ex) {
            log.error("[RealtimeHub] Lỗi serialize payload sự kiện {}: {}", event.type(), ex.getMessage());
            return;
        }

        List<UserConnection> deadConnections = new ArrayList<>();

        if (event.targetUserId() != null) {
            // Gửi đích danh cho 1 user (tất cả các tab đang mở của user đó)
            Set<UserConnection> conns = userConnections.get(event.targetUserId());
            if (conns != null) {
                for (UserConnection conn : conns) {
                    if (!sendToConnection(conn, event, payloadJson)) {
                        deadConnections.add(conn);
                    }
                }
            }
        } else if (event.targetRole() != null) {
            // Gửi cho tất cả client có role khớp (ví dụ ADMIN)
            String expectedRole = event.targetRole().toUpperCase();
            int delivered = 0;
            for (Set<UserConnection> conns : userConnections.values()) {
                for (UserConnection conn : conns) {
                    if (conn.role() != null && conn.role().toUpperCase().contains(expectedRole)) {
                        if (!sendToConnection(conn, event, payloadJson)) {
                            deadConnections.add(conn);
                        } else {
                            delivered++;
                        }
                    }
                }
            }
            // Chẩn đoán: cho biết sự kiện theo role đã tới được bao nhiêu kết nối SSE đang mở
            log.debug("[RealtimeHub] Sự kiện '{}' (id={}) gửi tới role {}: {} kết nối",
                    event.type(), event.eventId(), expectedRole, delivered);
        } else {
            // Gửi broadcast toàn hệ thống
            for (Set<UserConnection> conns : userConnections.values()) {
                for (UserConnection conn : conns) {
                    if (!sendToConnection(conn, event, payloadJson)) {
                        deadConnections.add(conn);
                    }
                }
            }
        }

        for (UserConnection dead : deadConnections) {
            try {
                dead.emitter().complete();
            } catch (Exception ignored) {}
            removeConnection(dead.userId(), dead);
        }
    }

    private boolean sendToConnection(UserConnection conn, RealtimeEvent event, String payloadJson) {
        try {
            synchronized (conn.emitter()) {
                conn.emitter().send(SseEmitter.event()
                        .id(event.eventId())
                        .name(event.type())
                        .data(payloadJson, MediaType.APPLICATION_JSON));
            }
            return true;
        } catch (Exception ex) {
            try {
                conn.emitter().complete();
            } catch (Exception ignored) {}
            return false;
        }
    }

    private void addToReplayBuffer(RealtimeEvent event) {
        replayBuffer.addLast(event);
        int maxBuffer = realtimeProperties.getReplayBufferSize();
        while (replayBuffer.size() > maxBuffer) {
            replayBuffer.pollFirst();
        }
    }

    private void replayMissedEvents(UserConnection conn, String lastEventId) {
        try {
            long lastId = Long.parseLong(lastEventId);
            for (RealtimeEvent event : replayBuffer) {
                try {
                    long currentId = Long.parseLong(event.eventId());
                    if (currentId > lastId && isEventApplicableTo(event, conn)) {
                        String payload = "{}";
                        try {
                            payload = event.data() != null ? objectMapper.writeValueAsString(event.data()) : "{}";
                        } catch (Exception ignored) {}
                        sendToConnection(conn, event, payload);
                    }
                } catch (NumberFormatException ignored) {}
            }
        } catch (NumberFormatException ignored) {
            log.debug("[RealtimeHub] Header Last-Event-ID không phải số: {}", lastEventId);
        }
    }

    private boolean isEventApplicableTo(RealtimeEvent event, UserConnection conn) {
        if (event.targetUserId() != null) {
            return event.targetUserId().equals(conn.userId());
        }
        if (event.targetRole() != null) {
            return conn.role() != null && conn.role().toUpperCase().contains(event.targetRole().toUpperCase());
        }
        return true;
    }

    /**
     * Heartbeat 20 giây gửi comment ": ping" để tránh ngắt kết nối
     */
    @Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        if (!realtimeProperties.isEnabled()) return;

        List<UserConnection> deadConnections = new ArrayList<>();
        for (Set<UserConnection> conns : userConnections.values()) {
            for (UserConnection conn : conns) {
                try {
                    synchronized (conn.emitter()) {
                        conn.emitter().send(SseEmitter.event().comment("ping"));
                    }
                } catch (Exception e) {
                    deadConnections.add(conn);
                }
            }
        }

        for (UserConnection dead : deadConnections) {
            try {
                dead.emitter().complete();
            } catch (Exception ignored) {}
            removeConnection(dead.userId(), dead);
        }
    }
}
