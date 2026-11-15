package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.HotSegmentDto;
import com.elearning.emotion.dto.live.LessonLiveDto;
import com.elearning.emotion.dto.live.LiveSnapshotDto;
import com.elearning.emotion.dto.live.StudentAttentionDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.service.emotion.SessionSlidingWindowCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * LiveMetricsService — Giai đoạn 2 (SSE Live Streaming).
 * Gom và tính toán số liệu lớp học theo thời gian thực trực tiếp từ RAM (<1ms, KHÔNG đọc DB).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveMetricsService {

    private static final int ACTIVE_FRAME_WINDOW_SECONDS = 15; // Quy tắc "đang xem": có frame trong 15s gần nhất
    private static final int BORED_ATTENTION_THRESHOLD = 18;   // BORED/NO_FACE liên tục >= 18s
    private static final int CONFUSED_ATTENTION_THRESHOLD = 6;  // CONFUSED liên tục >= 6s

    private final SessionSlidingWindowCache slidingWindowCache;
    private final ContentItemRepository contentItemRepository;

    // Cache tiêu đề bài học trong RAM để không bao giờ phải truy vấn DB trong chu kỳ 3s
    private final Map<String, String> lessonTitleCache = new ConcurrentHashMap<>();

    public LiveSnapshotDto buildSnapshot(String teacherId) {
        LocalDateTime now = LocalDateTime.now();
        Set<String> sessionIds = slidingWindowCache.getSessionIdsForTeacher(teacherId);
        if (sessionIds.isEmpty()) {
            return new LiveSnapshotDto(now, Collections.emptyList());
        }

        // 1. Lọc các phiên đang hoạt động trong 15s gần nhất
        List<SessionSlidingWindowCache.SessionMemoryState> activeSessions = new ArrayList<>();
        for (String sid : sessionIds) {
            SessionSlidingWindowCache.SessionMemoryState state = slidingWindowCache.get(sid);
            if (state != null && state.getLastFrameAt() != null) {
                long secSinceLastFrame = Duration.between(state.getLastFrameAt(), now).getSeconds();
                if (secSinceLastFrame <= ACTIVE_FRAME_WINDOW_SECONDS && !"FINISHED".equals(state.getStatus()) && !"ABANDONED".equals(state.getStatus())) {
                    activeSessions.add(state);
                }
            }
        }

        if (activeSessions.isEmpty()) {
            return new LiveSnapshotDto(now, Collections.emptyList());
        }

        // 2. Nhóm theo contentItemId (bài giảng)
        Map<String, List<SessionSlidingWindowCache.SessionMemoryState>> byLesson = activeSessions.stream()
                .filter(s -> s.getContentItemId() != null)
                .collect(Collectors.groupingBy(SessionSlidingWindowCache.SessionMemoryState::getContentItemId));

        List<LessonLiveDto> lessons = new ArrayList<>();

        for (Map.Entry<String, List<SessionSlidingWindowCache.SessionMemoryState>> entry : byLesson.entrySet()) {
            String contentItemId = entry.getKey();
            List<SessionSlidingWindowCache.SessionMemoryState> studentsInLesson = entry.getValue();

            String title = resolveLessonTitle(contentItemId);
            int viewers = studentsInLesson.size();

            // Phân bố trạng thái cảm xúc (dùng smoothedState chống nhấp nháy)
            Map<String, Integer> distribution = new LinkedHashMap<>();
            distribution.put("ENGAGED", 0);
            distribution.put("INTERESTED", 0);
            distribution.put("CONFUSED", 0);
            distribution.put("BORED", 0);
            distribution.put("NO_FACE", 0);

            List<StudentAttentionDto> attentionList = new ArrayList<>();
            int studentIdx = 1;

            for (SessionSlidingWindowCache.SessionMemoryState student : studentsInLesson) {
                String smoothed = student.getSmoothedState();
                if (!distribution.containsKey(smoothed)) {
                    smoothed = "ENGAGED";
                }
                distribution.put(smoothed, distribution.get(smoothed) + 1);

                // Kiểm tra "Cần chú ý": BORED/NO_FACE liên tục >= 18s hoặc CONFUSED >= 6s
                LocalDateTime stateSince = student.getStateSince();
                long sinceSec = (stateSince != null) ? Math.max(0, Duration.between(stateSince, now).getSeconds()) : 0;
                String rawLastState = student.getLastState();

                boolean isOffTask = ("BORED".equalsIgnoreCase(rawLastState) || "NO_FACE".equalsIgnoreCase(rawLastState))
                        && sinceSec >= BORED_ATTENTION_THRESHOLD;
                boolean isConfused = "CONFUSED".equalsIgnoreCase(rawLastState) && sinceSec >= CONFUSED_ATTENTION_THRESHOLD;

                if (isOffTask || isConfused) {
                    String alias = "Học viên #" + studentIdx;
                    attentionList.add(new StudentAttentionDto(
                            alias,
                            rawLastState != null ? rawLastState.toUpperCase() : "CONFUSED",
                            sinceSec,
                            student.getLastVideoSec()
                    ));
                }
                studentIdx++;
            }

            // Đoạn video nóng (Hot Segment) trong 60 giây gần nhất
            HotSegmentDto hotSegment = computeHotSegment(studentsInLesson, now);

            lessons.add(new LessonLiveDto(
                    contentItemId,
                    title,
                    viewers,
                    distribution,
                    attentionList,
                    hotSegment
            ));
        }

        return new LiveSnapshotDto(now, lessons);
    }

    /**
     * Gom vị trí video của học viên tiêu cực trong 60s gần nhất theo bucket 10s.
     */
    private HotSegmentDto computeHotSegment(List<SessionSlidingWindowCache.SessionMemoryState> students, LocalDateTime now) {
        LocalDateTime cutoff60s = now.minusSeconds(60);

        // Bucket index (10s) -> {totalSamples, negativeSamples}
        Map<Integer, int[]> bucketStats = new HashMap<>();

        for (SessionSlidingWindowCache.SessionMemoryState st : students) {
            List<SessionSlidingWindowCache.FrameSample> frames = st.getRecentFramesReversed();
            for (SessionSlidingWindowCache.FrameSample f : frames) {
                if (f.capturedAt() != null && f.capturedAt().isAfter(cutoff60s) && f.videoTimeSec() != null && f.videoTimeSec() >= 0) {
                    int bIdx = (int) (f.videoTimeSec() / 10);
                    int[] counts = bucketStats.computeIfAbsent(bIdx, k -> new int[2]);
                    counts[0]++; // total
                    String stUpper = f.learningState() != null ? f.learningState().toUpperCase() : "";
                    if ("CONFUSED".equals(stUpper) || "BORED".equals(stUpper) || "NO_FACE".equals(stUpper)) {
                        counts[1]++; // negative
                    }
                }
            }
        }

        if (bucketStats.isEmpty()) {
            return null;
        }

        // Tìm bucket có tỉ lệ tiêu cực cao nhất với ít nhất 3 mẫu
        int bestBucket = -1;
        double bestRatio = 0.0;

        for (Map.Entry<Integer, int[]> entry : bucketStats.entrySet()) {
            int[] c = entry.getValue();
            if (c[0] >= 3) {
                double ratio = (double) c[1] / c[0];
                if (ratio >= 0.35 && ratio > bestRatio) {
                    bestRatio = ratio;
                    bestBucket = entry.getKey();
                }
            }
        }

        if (bestBucket >= 0) {
            int startSec = bestBucket * 10;
            int endSec = startSec + 30; // mở rộng cửa sổ xem xét 30s xung quanh bucket
            return new HotSegmentDto(startSec, endSec, Math.round(bestRatio * 100.0) / 100.0);
        }

        return null;
    }

    private String resolveLessonTitle(String contentItemId) {
        return lessonTitleCache.computeIfAbsent(contentItemId, id -> {
            try {
                return contentItemRepository.findById(id)
                        .map(ContentItem::getTitle)
                        .orElse("Bài giảng video");
            } catch (Exception e) {
                return "Bài giảng video";
            }
        });
    }

    public void evictLessonTitleCache(String contentItemId) {
        lessonTitleCache.remove(contentItemId);
    }
}
