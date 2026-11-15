package com.elearning.emotion.service;

import com.elearning.emotion.dto.AdaptiveSuggestionDto;
import com.elearning.emotion.entity.AdaptiveSuggestion;
import com.elearning.emotion.entity.EmotionLog;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.AdaptiveSuggestionRepository;
import com.elearning.emotion.repository.EmotionLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * AdaptiveSuggestionService — Giai đoạn 8 (KLTN).
 * Phân tích cửa sổ trượt (sliding window) gồm 6 khung hình gần nhất để đưa ra gợi ý học tập thích ứng.
 * Quy tắc:
 *  - CONFUSED >= 3 khung: Gợi ý tua lại 30s để nghe lại lý thuyết.
 *  - BORED >= 3 khung: Gợi ý tạm dừng nghỉ ngơi 2 phút thư giãn mắt.
 *  - NO_FACE >= 3 khung: Nhắc nhở ngồi ngay ngắn trước camera để ghi nhận chuyên cần.
 * Cơ chế chống làm phiền (Anti-spam / Anti-fatigue):
 *  - Tối đa 3 gợi ý / phiên học.
 *  - Cooldown tối thiểu 180 giây (3 phút) giữa 2 lần gợi ý.
 *  - Chỉ kích hoạt khi phiên học ở trạng thái LEARNING (không gợi ý khi đang PAUSED hoặc FINISHED).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdaptiveSuggestionService {

    private static final int MAX_SUGGESTIONS_PER_SESSION = 100;
    private static final long COOLDOWN_SECONDS = 15; // 15 giây cooldown để có thể nhắc lại khi mất tập trung tiếp
    private static final int OFF_TASK_TRIGGER_THRESHOLD = 18; // 18 giây mất tập trung / rời camera liên tiếp
    private static final int CONFUSED_TRIGGER_THRESHOLD = 6;  // 6 giây bối rối liên tiếp

    private final AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    private final EmotionLogRepository emotionLogRepository;
    private final com.elearning.emotion.service.emotion.SessionSlidingWindowCache slidingWindowCache;
    private final com.elearning.emotion.repository.LearningSessionRepository sessionRepository;

    @Transactional
    public AdaptiveSuggestionDto evaluateSuggestions(LearningSession session, Float currentVideoTimeSec) {
        if (session == null) return null;
        return evaluateSuggestions(session.getId(), session.getStatus(), currentVideoTimeSec);
    }

    @Transactional
    public AdaptiveSuggestionDto evaluateSuggestions(String sessionId, String status, Float currentVideoTimeSec) {
        if (sessionId == null || !"LEARNING".equalsIgnoreCase(status)) {
            return null;
        }

        var memoryState = slidingWindowCache.getOrCreate(sessionId);

        // 1. Kiểm tra giới hạn số lần gợi ý trong phiên học (từ RAM)
        if (memoryState.getSuggestionCount() >= MAX_SUGGESTIONS_PER_SESSION) {
            return null;
        }

        // 2. Kiểm tra thời gian giãn cách Cooldown (từ RAM)
        LocalDateTime lastAt = memoryState.getLastSuggestionAt();
        if (lastAt != null) {
            long secondsSinceLast = Duration.between(lastAt, LocalDateTime.now()).getSeconds();
            if (secondsSinceLast < COOLDOWN_SECONDS) {
                return null;
            }
        }

        // 3. Lấy cửa sổ trượt các khung hình gần nhất từ RAM (độ trễ <0.1ms, không đụng DB)
        List<com.elearning.emotion.service.emotion.SessionSlidingWindowCache.FrameSample> recentLogs = memoryState.getRecentFramesReversed();
        if (recentLogs.isEmpty()) {
            return null;
        }

        int currentTime = (currentVideoTimeSec != null && !currentVideoTimeSec.isNaN())
                ? Math.round(currentVideoTimeSec)
                : 0;

        // Đếm chuỗi liên tiếp BORED và NO_FACE (được tính như nhau và cộng dồn) từ khung mới nhất trở về trước
        long consecutiveOffTaskCount = 0;
        float firstDistractedTime = currentTime;
        for (var l : recentLogs) {
            String state = l.learningState();
            if ("BORED".equalsIgnoreCase(state) || "NO_FACE".equalsIgnoreCase(state)) {
                consecutiveOffTaskCount++;
                if (l.videoTimeSec() != null) {
                    firstDistractedTime = l.videoTimeSec();
                }
            } else {
                // Nếu quay lại tập trung (ENGAGED, INTERESTED, NEUTRAL) -> chuỗi liên tiếp bị ngắt, bỏ đánh dấu
                break;
            }
        }

        // Đếm chuỗi liên tiếp CONFUSED
        long consecutiveConfusedCount = 0;
        for (var l : recentLogs) {
            if ("CONFUSED".equalsIgnoreCase(l.learningState())) {
                consecutiveConfusedCount++;
            } else {
                break;
            }
        }

        String triggerType = null;
        String message = null;
        String actionType = null;
        int segStart = 0;
        int segEnd = currentTime;

        if (consecutiveOffTaskCount >= OFF_TASK_TRIGGER_THRESHOLD) {
            triggerType = "BORED";
            actionType = "REWIND_TO_START";
            segStart = Math.max(0, Math.round(firstDistractedTime));
            segEnd = Math.max(segStart, currentTime);
            int duration = Math.max(1, segEnd - segStart);
            message = String.format("Bạn đã mất tập trung hoặc rời camera từ mốc %02d:%02d đến %02d:%02d (%d giây). Hãy chú ý để không bỏ lỡ kiến thức nhé!",
                    segStart / 60, segStart % 60, segEnd / 60, segEnd % 60, duration);
        } else if (consecutiveConfusedCount >= CONFUSED_TRIGGER_THRESHOLD) {
            triggerType = "CONFUSED";
            actionType = "REWIND";
            message = "Đoạn kiến thức này có vẻ hơi khó hiểu, bạn có muốn tua lại 30 giây để nghe lại lý thuyết không?";
            segStart = Math.max(0, currentTime - 30);
            segEnd = currentTime;
        }

        if (triggerType == null) {
            return null;
        }

        log.info("[AdaptiveSuggestion] Triggering suggestion {} for session {} at video time {}s",
                triggerType, sessionId, currentTime);

        AdaptiveSuggestion suggestion = AdaptiveSuggestion.builder()
                .session(sessionRepository.getReferenceById(sessionId))
                .triggerType(triggerType)
                .videoSegmentStart(segStart)
                .videoSegmentEnd(segEnd)
                .triggeredAt(LocalDateTime.now())
                .wasAccepted(null)
                .build();

        suggestion = adaptiveSuggestionRepository.save(suggestion);
        memoryState.recordSuggestion();
        return AdaptiveSuggestionDto.from(suggestion, message, actionType);
    }

    @Transactional
    public AdaptiveSuggestionDto respondToSuggestion(String suggestionId, boolean wasAccepted, String userId) {
        AdaptiveSuggestion suggestion = adaptiveSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay goi y hoc tap"));

        if (userId == null || !suggestion.getSession().getUser().getId().equals(userId)) {
            throw new SecurityException("Ban khong co quyen phan hoi goi y nay");
        }

        suggestion.setWasAccepted(wasAccepted);
        suggestion = adaptiveSuggestionRepository.save(suggestion);
        log.info("[AdaptiveSuggestion] Student {} responded to suggestion {}: accepted={}",
                userId, suggestionId, wasAccepted);

        return AdaptiveSuggestionDto.from(suggestion, "Phản hồi đã được ghi nhận", null);
    }
}
