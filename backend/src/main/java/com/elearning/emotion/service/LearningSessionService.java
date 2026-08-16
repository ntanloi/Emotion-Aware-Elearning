package com.elearning.emotion.service;

import com.elearning.emotion.entity.EmotionLog;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.entity.Lesson;
import com.elearning.emotion.repository.EmotionLogRepository;
import com.elearning.emotion.repository.LearningSessionRepository;
import com.elearning.emotion.repository.LessonRepository;
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
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final EmotionLogRepository emotionLogRepository;

    /** FR-LES-02: bat dau phien hoc khi mo bai giang */
    public LearningSession startSession(String userId, String lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay bai giang"));
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        LearningSession session = LearningSession.builder()
                .user(user)
                .lesson(lesson)
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
