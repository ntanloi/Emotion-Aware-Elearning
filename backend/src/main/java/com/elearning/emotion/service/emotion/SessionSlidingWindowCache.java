package com.elearning.emotion.service.emotion;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cửa sổ trượt trong bộ nhớ (In-Memory Sliding Window) cho phiên học.
 * Giúp AdaptiveSuggestionService và LiveMetricsService đánh giá tức thì (<0.1ms) mà KHÔNG cần truy vấn Database,
 * cho phép tách rời hoàn toàn luồng AI suy luận và luồng Live khỏi luồng ghi DB bất đồng bộ.
 */
@Component
public class SessionSlidingWindowCache {

    public record FrameSample(String learningState, Float videoTimeSec, LocalDateTime capturedAt) {}

    public static class SessionMemoryState {
        private final Deque<FrameSample> recentFrames = new ArrayDeque<>(35);
        private int suggestionCount = 0;
        private LocalDateTime lastSuggestionAt = null;
        private LocalDateTime lastActiveAt = LocalDateTime.now();

        // Giai đoạn 1: Thông tin phiên học lưu trong RAM sau khi nạp 1 lần ở frame đầu tiên
        private String sessionId;
        private String userId;
        private String contentItemId;
        private String courseId;
        private String teacherId;
        private String status;
        private LocalDateTime lastFrameAt;
        private String lastState;
        private LocalDateTime stateSince;
        private Float lastVideoSec;
        private LocalDateTime lastTouchAt;
        private volatile boolean metadataLoaded = false;

        public synchronized void initMetadata(String sessionId, String userId, String contentItemId,
                                             String courseId, String teacherId, String status) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.contentItemId = contentItemId;
            this.courseId = courseId;
            this.teacherId = teacherId;
            this.status = status;
            this.metadataLoaded = true;
        }

        public boolean isMetadataLoaded() {
            return metadataLoaded;
        }

        public synchronized void addFrame(String learningState, Float videoTimeSec) {
            LocalDateTime now = LocalDateTime.now();
            lastActiveAt = now;
            lastFrameAt = now;
            lastVideoSec = videoTimeSec;

            String stateUpper = (learningState != null) ? learningState.toUpperCase() : "ENGAGED";
            if (lastState == null || !lastState.equalsIgnoreCase(stateUpper)) {
                lastState = stateUpper;
                stateSince = now;
            }

            if (recentFrames.size() >= 30) {
                recentFrames.removeFirst();
            }
            recentFrames.addLast(new FrameSample(stateUpper, videoTimeSec, now));
        }

        /**
         * Chống nhấp nháy: trạng thái của học viên là trạng thái chiếm đa số trong 5 frame gần nhất.
         */
        public synchronized String getSmoothedState() {
            if (recentFrames.isEmpty()) {
                return lastState != null ? lastState : "ENGAGED";
            }
            List<FrameSample> list = new ArrayList<>(recentFrames);
            int count = Math.min(5, list.size());
            Map<String, Integer> freq = new HashMap<>();
            for (int i = list.size() - count; i < list.size(); i++) {
                String s = list.get(i).learningState();
                if (s != null) {
                    freq.put(s.toUpperCase(), freq.getOrDefault(s.toUpperCase(), 0) + 1);
                }
            }
            return freq.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(lastState != null ? lastState : "ENGAGED");
        }

        public synchronized List<FrameSample> getRecentFramesReversed() {
            List<FrameSample> list = new ArrayList<>(recentFrames);
            Collections.reverse(list);
            return list;
        }

        public synchronized int getSuggestionCount() {
            return suggestionCount;
        }

        public synchronized LocalDateTime getLastSuggestionAt() {
            return lastSuggestionAt;
        }

        public synchronized void recordSuggestion() {
            this.suggestionCount++;
            this.lastSuggestionAt = LocalDateTime.now();
        }

        public synchronized LocalDateTime getLastActiveAt() {
            return lastActiveAt;
        }

        public synchronized String getSessionId() {
            return sessionId;
        }

        public synchronized void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public synchronized String getUserId() {
            return userId;
        }

        public synchronized String getContentItemId() {
            return contentItemId;
        }

        public synchronized String getCourseId() {
            return courseId;
        }

        public synchronized String getTeacherId() {
            return teacherId;
        }

        public synchronized String getStatus() {
            return status;
        }

        public synchronized void setStatus(String status) {
            this.status = status;
        }

        public synchronized LocalDateTime getLastFrameAt() {
            return lastFrameAt;
        }

        public synchronized String getLastState() {
            return lastState;
        }

        public synchronized LocalDateTime getStateSince() {
            return stateSince;
        }

        public synchronized Float getLastVideoSec() {
            return lastVideoSec;
        }

        public synchronized LocalDateTime getLastTouchAt() {
            return lastTouchAt;
        }

        public synchronized void setLastTouchAt(LocalDateTime lastTouchAt) {
            this.lastTouchAt = lastTouchAt;
        }
    }

    private final Map<String, SessionMemoryState> sessionStates = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> teacherToSessions = new ConcurrentHashMap<>();

    public SessionMemoryState get(String sessionId) {
        return sessionStates.get(sessionId);
    }

    public SessionMemoryState getOrCreate(String sessionId) {
        return sessionStates.computeIfAbsent(sessionId, id -> {
            SessionMemoryState s = new SessionMemoryState();
            s.setSessionId(id);
            return s;
        });
    }

    public void registerTeacherSession(String teacherId, String sessionId) {
        if (teacherId != null && sessionId != null) {
            teacherToSessions.computeIfAbsent(teacherId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        }
    }

    public Set<String> getSessionIdsForTeacher(String teacherId) {
        if (teacherId == null) return Collections.emptySet();
        Set<String> set = teacherToSessions.get(teacherId);
        return set != null ? Collections.unmodifiableSet(set) : Collections.emptySet();
    }

    public void recordFrame(String sessionId, String learningState, Float videoTimeSec) {
        getOrCreate(sessionId).addFrame(learningState, videoTimeSec);
    }

    public void removeSession(String sessionId) {
        SessionMemoryState removed = sessionStates.remove(sessionId);
        if (removed != null && removed.getTeacherId() != null) {
            Set<String> set = teacherToSessions.get(removed.getTeacherId());
            if (set != null) {
                set.remove(sessionId);
            }
        }
    }

    /**
     * Dọn dẹp các phiên học không còn hoạt động quá 45 phút để giải phóng RAM
     */
    public void cleanupIdleSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(45);
        Iterator<Map.Entry<String, SessionMemoryState>> it = sessionStates.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, SessionMemoryState> entry = it.next();
            if (entry.getValue().getLastActiveAt().isBefore(cutoff)) {
                String teacherId = entry.getValue().getTeacherId();
                if (teacherId != null) {
                    Set<String> set = teacherToSessions.get(teacherId);
                    if (set != null) set.remove(entry.getKey());
                }
                it.remove();
            }
        }
    }
}
