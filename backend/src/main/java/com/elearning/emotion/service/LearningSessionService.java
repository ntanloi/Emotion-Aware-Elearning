package com.elearning.emotion.service;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.EmotionLog;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.EmotionLogRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.LearningSessionRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LearningSessionService {

    private static final Set<String> POSITIVE_OR_NEUTRAL = Set.of("happy", "neutral", "surprised");

    private final LearningSessionRepository sessionRepository;
    private final ContentItemRepository contentItemRepository;
    private final UserRepository userRepository;
    private final EmotionLogRepository emotionLogRepository;
    private final EnrollmentRepository enrollmentRepository;

    /**
     * FR-LES-02: bat dau phien hoc khi mo video bai giang.
     * AI cam xuc CHI ap dung cho video bai giang ly thuyet - khong ap dung cho
     * bai tap/de thi (Part 1-7, tu vung, ngu phap, chinh ta), nen chan cung dieu
     * kien nay ngay tai day, vi DB khong ep duoc bang FK co dieu kien.
     */
    public LearningSession startSession(String userId, String contentItemId) {
        ContentItem contentItem = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay noi dung"));
        if (!contentItem.isVideoLecture()) {
            throw new IllegalArgumentException(
                    "Chi co the tao phien hoc (theo doi cam xuc) cho video bai giang ly thuyet");
        }
        // BR-12: phai da dang ky khoa hoc chua video nay
        String courseId = contentItem.getCourse().getId();
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw new IllegalArgumentException("Ban chua dang ky khoa hoc chua video bai giang nay");
        }
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        LearningSession session = LearningSession.builder()
                .user(user)
                .contentItem(contentItem)
                .status("WAITING")
                .hasCameraPermission(false)
                .build();
        return sessionRepository.save(session);
    }

    /** BR-03: dong y hoac tu choi deu chuyen sang DANG HOC */
    public LearningSession setCameraPermission(String sessionId, boolean granted) {
        LearningSession session = getOrThrow(sessionId);
        session.setHasCameraPermission(granted);
        session.setStatus("LEARNING");
        return sessionRepository.save(session);
    }

    public LearningSession pause(String sessionId) {
        LearningSession session = getOrThrow(sessionId);
        session.setStatus("PAUSED");
        return sessionRepository.save(session);
    }

    public LearningSession resume(String sessionId) {
        LearningSession session = getOrThrow(sessionId);
        session.setStatus("LEARNING");
        return sessionRepository.save(session);
    }

    /** BR-05: tinh focus_score khi ket thuc/bo do */
    public LearningSession finish(String sessionId, boolean abandoned) {
        LearningSession session = getOrThrow(sessionId);
        session.setStatus(abandoned ? "ABANDONED" : "FINISHED");
        session.setEndTime(LocalDateTime.now());
        session.setFocusScore(computeFocusScore(sessionId));
        return sessionRepository.save(session);
    }

    private float computeFocusScore(String sessionId) {
        // BR-11: loai bo cac ban ghi co confidence_score < 50%
        List<EmotionLog> validLogs = emotionLogRepository
                .findBySessionIdAndConfidenceScoreGreaterThanEqual(sessionId, 0.5f);

        if (validLogs.isEmpty()) return 0f;

        long positiveCount = validLogs.stream()
                .filter(l -> POSITIVE_OR_NEUTRAL.contains(l.getEmotionLabel()))
                .count();

        return (positiveCount * 100f) / validLogs.size();
    }

    private LearningSession getOrThrow(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay phien hoc"));
    }
}
