package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.LiveAlertEventDto;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * LiveStreamRegistry — Quản lý vòng đời các kết nối SSE của giảng viên.
 * - Tối đa 3 kết nối đồng thời cho mỗi giảng viên (tránh rò rỉ khi mở nhiều tab).
 * - Tự động dọn dẹp khi emitter đóng, timeout hoặc ném lỗi IO.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LiveStreamRegistry {

    private static final int MAX_EMITTERS_PER_TEACHER = 3;

    private final ObjectMapper objectMapper;
    private final Map<String, Set<SseEmitter>> teacherEmitters = new ConcurrentHashMap<>();
    private final java.util.concurrent.atomic.AtomicLong eventIdSeq = new java.util.concurrent.atomic.AtomicLong(0);

    public void registerEmitter(String teacherId, SseEmitter emitter) {
        if (teacherId == null || emitter == null) return;

        Set<SseEmitter> set = teacherEmitters.computeIfAbsent(teacherId, k -> ConcurrentHashMap.newKeySet());

        // Kiểm tra giới hạn 3 kết nối: nếu vượt quá, hoàn thành kết nối cũ nhất
        synchronized (set) {
            if (set.size() >= MAX_EMITTERS_PER_TEACHER) {
                Iterator<SseEmitter> it = set.iterator();
                if (it.hasNext()) {
                    SseEmitter oldest = it.next();
                    try {
                        oldest.complete();
                    } catch (Exception ignored) {}
                    it.remove();
                }
            }
            set.add(emitter);
        }

        emitter.onCompletion(() -> removeEmitter(teacherId, emitter));
        emitter.onTimeout(() -> {
            log.debug("[LiveStreamRegistry] Emitter timeout cho giảng viên {}", teacherId);
            removeEmitter(teacherId, emitter);
        });
        emitter.onError(ex -> {
            log.debug("[LiveStreamRegistry] Emitter lỗi cho giảng viên {}: {}", teacherId, ex.getMessage());
            removeEmitter(teacherId, emitter);
        });
    }

    public void removeEmitter(String teacherId, SseEmitter emitter) {
        if (teacherId == null || emitter == null) return;
        Set<SseEmitter> set = teacherEmitters.get(teacherId);
        if (set != null) {
            set.remove(emitter);
            if (set.isEmpty()) {
                teacherEmitters.computeIfPresent(teacherId, (k, s) -> s.isEmpty() ? null : s);
            }
        }
    }

    public Set<String> getActiveTeacherIds() {
        return Collections.unmodifiableSet(teacherEmitters.keySet());
    }

    public int getActiveConnectionCount(String teacherId) {
        Set<SseEmitter> set = teacherEmitters.get(teacherId);
        return set != null ? set.size() : 0;
    }

    public void broadcastSnapshot(String teacherId, LiveSnapshotDto snapshot) {
        Set<SseEmitter> set = teacherEmitters.get(teacherId);
        if (set == null || set.isEmpty()) return;

        String data;
        try {
            data = objectMapper.writeValueAsString(snapshot);
        } catch (Exception ex) {
            log.error("[LiveStreamRegistry] Lỗi serialize snapshot: {}", ex.getMessage());
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        String eventId = String.valueOf(eventIdSeq.incrementAndGet());
        for (SseEmitter emitter : set) {
            try {
                synchronized (emitter) {
                    emitter.send(SseEmitter.event()
                            .id(eventId)
                            .name("snapshot")
                            .data(data, MediaType.APPLICATION_JSON));
                }
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        for (SseEmitter dead : deadEmitters) {
            removeEmitter(teacherId, dead);
        }
    }

    public void broadcastAlert(String teacherId, LiveAlertEventDto alert) {
        Set<SseEmitter> set = teacherEmitters.get(teacherId);
        if (set == null || set.isEmpty()) return;

        String data;
        try {
            data = objectMapper.writeValueAsString(alert);
        } catch (Exception ex) {
            log.error("[LiveStreamRegistry] Lỗi serialize alert: {}", ex.getMessage());
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        String eventId = String.valueOf(eventIdSeq.incrementAndGet());
        for (SseEmitter emitter : set) {
            try {
                synchronized (emitter) {
                    emitter.send(SseEmitter.event()
                            .id(eventId)
                            .name("alert")
                            .data(data, MediaType.APPLICATION_JSON));
                }
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        for (SseEmitter dead : deadEmitters) {
            removeEmitter(teacherId, dead);
        }
    }

    /**
     * Gửi SSE Comment ": ping\n\n" mỗi 20 giây để giữ kết nối không bị Proxy/Nginx ngắt
     */
    public void sendHeartbeat() {
        for (Map.Entry<String, Set<SseEmitter>> entry : teacherEmitters.entrySet()) {
            String teacherId = entry.getKey();
            Set<SseEmitter> set = entry.getValue();
            List<SseEmitter> deadEmitters = new ArrayList<>();

            for (SseEmitter emitter : set) {
                try {
                    synchronized (emitter) {
                        emitter.send(SseEmitter.event().comment("ping"));
                    }
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }

            for (SseEmitter dead : deadEmitters) {
                removeEmitter(teacherId, dead);
            }
        }
    }
}
