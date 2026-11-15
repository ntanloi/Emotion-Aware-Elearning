package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * LiveBroadcastScheduler — Giai đoạn 2 (SSE).
 * Định kỳ phát snapshot (mỗi 3s khi có thay đổi hoặc 15s nếu không đổi) và heartbeat (20s)
 * chỉ cho những giảng viên đang có client kết nối SSE.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LiveBroadcastScheduler {

    private final LiveStreamRegistry streamRegistry;
    private final LiveMetricsService metricsService;
    private final ObjectMapper objectMapper;

    // Lưu trữ dấu vết lần gửi cuối của từng giảng viên để so sánh thay đổi
    private static class TeacherLiveState {
        String lastPayloadHash = "";
        LocalDateTime lastSentAt = LocalDateTime.MIN;
    }

    private final Map<String, TeacherLiveState> teacherStates = new ConcurrentHashMap<>();

    @Scheduled(fixedRate = 3000)
    public void broadcastSnapshots() {
        Set<String> activeTeacherIds = streamRegistry.getActiveTeacherIds();
        if (activeTeacherIds.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (String teacherId : activeTeacherIds) {
            try {
                LiveSnapshotDto snapshot = metricsService.buildSnapshot(teacherId);
                String json = objectMapper.writeValueAsString(snapshot.lessons());
                int hash = json.hashCode();
                String hashStr = String.valueOf(hash);

                TeacherLiveState state = teacherStates.computeIfAbsent(teacherId, k -> new TeacherLiveState());
                boolean changed = !hashStr.equals(state.lastPayloadHash);
                boolean timeout15s = Duration.between(state.lastSentAt, now).getSeconds() >= 15;

                if (changed || timeout15s) {
                    streamRegistry.broadcastSnapshot(teacherId, snapshot);
                    state.lastPayloadHash = hashStr;
                    state.lastSentAt = now;
                }
            } catch (Exception ex) {
                log.error("[LiveBroadcastScheduler] Lỗi khi tạo/phát snapshot cho giảng viên {}: {}", teacherId, ex.getMessage());
            }
        }

        // Dọn dẹp trạng thái của các giảng viên không còn kết nối
        teacherStates.keySet().removeIf(tId -> !activeTeacherIds.contains(tId));
    }

    @Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        try {
            streamRegistry.sendHeartbeat();
        } catch (Exception e) {
            log.debug("[LiveBroadcastScheduler] Lỗi gửi heartbeat SSE: {}", e.getMessage());
        }
    }
}
