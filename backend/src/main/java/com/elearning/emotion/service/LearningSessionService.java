package com.elearning.emotion.service;

import com.elearning.emotion.dto.SessionSummaryDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.EmotionLog;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class LearningSessionService {

    private static final Set<String> POSITIVE_OR_NEUTRAL = Set.of("happy", "neutral", "surprised");

    private final LearningSessionRepository sessionRepository;
    private final ContentItemRepository contentItemRepository;
    private final UserRepository userRepository;
    private final EmotionLogRepository emotionLogRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseAccessService courseAccessService;
    private final AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final com.elearning.emotion.service.report.ReportCalculationService reportCalculationService;
    private final com.elearning.emotion.service.emotion.SessionSlidingWindowCache slidingWindowCache;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final com.elearning.emotion.config.RewardProperties rewardProps;
    private final VideoViewAttemptService attemptService;
    private final com.elearning.emotion.service.emotion.FaceLostTracker faceLostTracker;
    private final VideoViewAttemptRepository attemptRepo;

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
        // BR-12 & B3: kiểm tra quyền học dùng chung chuẩn qua CourseAccessService (chủ khóa, admin, đơn PAID hoặc enrollment)
        if (!courseAccessService.canLearn(userId, contentItem.getCourse())) {
            throw new IllegalArgumentException("Ban chua dang ky khoa hoc chua video bai giang nay");
        }

        // Mỗi học viên chỉ có một phiên đang chạy tại một thời điểm (đóng các phiên cũ đang chạy)
        for (LearningSession old : sessionRepository.findLearningByUserId(userId)) {
            try {
                finish(old.getId(), true, userId);
            } catch (Exception ex) {
                log.warn("Không đóng được phiên cũ {}: {}", old.getId(), ex.getMessage());
            }
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
    public LearningSession setCameraPermission(String sessionId, boolean granted, String userId) {
        return setCameraPermission(sessionId, granted, "v1.0", userId);
    }

    /** H5 Item 5: Ghi nhận sự đồng ý/từ chối bật camera kèm phiên bản chính sách dữ liệu */
    public LearningSession setCameraPermission(String sessionId, boolean granted, String consentVersion, String userId) {
        LearningSession session = getOrThrow(sessionId, userId);
        session.setHasCameraPermission(granted);
        session.setStatus("LEARNING");
        session.setCameraChoice(granted ? "ON" : "OFF");

        if (granted && rewardProps.isTrackingEnabled()) {
            String attemptId = attemptService.openOrGet(userId, session.getContentItem().getId());
            session.setAttemptId(attemptId);
        }

        String version = (consentVersion != null && !consentVersion.isBlank()) ? consentVersion.trim() : "v1.0";
        session.setConsentVersion(version);
        session.setConsentAt(LocalDateTime.now());

        // Đồng bộ sự đồng ý lên hồ sơ người dùng
        User user = session.getUser();
        if (user != null) {
            user.setCameraConsentVersion(version);
            user.setCameraConsentAt(LocalDateTime.now());
            userRepository.save(user);
        }

        return sessionRepository.save(session);
    }

    public LearningSession pause(String sessionId, String userId) {
        LearningSession session = getOrThrow(sessionId, userId);
        session.setStatus("PAUSED");
        var mem = slidingWindowCache.get(sessionId);
        if (mem != null) mem.setStatus("PAUSED");
        return sessionRepository.save(session);
    }

    public LearningSession resume(String sessionId, String userId) {
        LearningSession session = getOrThrow(sessionId, userId);
        session.setStatus("LEARNING");
        faceLostTracker.clear(sessionId);
        var mem = slidingWindowCache.get(sessionId);
        if (mem != null) mem.setStatus("LEARNING");
        return sessionRepository.save(session);
    }

    /** BR-05 & GĐ 8: tinh focus_score (engagement_score) khi ket thuc/bo do */
    @Transactional
    public LearningSession finish(String sessionId, boolean abandoned, String userId) {
        LearningSession session = getOrThrow(sessionId, userId);
        session.setStatus(abandoned ? "ABANDONED" : "FINISHED");
        session.setEndTime(LocalDateTime.now());
        session.setFocusScore(computeFocusScore(sessionId));
        faceLostTracker.clear(sessionId);

        // Cập nhật lần cuối thời gian học thực tế active_seconds
        sessionRepository.touchSessionActivity(sessionId, LocalDateTime.now());

        // Giải phóng cache RAM
        slidingWindowCache.removeSession(sessionId);

        LearningSession saved = sessionRepository.save(session);

        // Giai đoạn 6: Phát sự kiện để cập nhật tức thì Báo cáo học tập cá nhân
        if (saved.getUser() != null) {
            eventPublisher.publishEvent(new com.elearning.emotion.event.SessionFinishedEvent(
                    saved.getId(), saved.getUser().getId(), java.time.LocalDate.now()
            ));
        }

        return saved;
    }

    /**
     * Cập nhật trạng thái phiên học (ví dụ: chuyển qua lại giữa LEARNING và FACE_LOST).
     */
    @Transactional
    public void markStatus(String sessionId, String status) {
        LearningSession s = sessionRepository.findById(sessionId).orElse(null);
        if (s == null) return;
        s.setStatus(status);
        s.setFaceLostSince("FACE_LOST".equals(status) ? LocalDateTime.now() : null);
        sessionRepository.save(s);
        var mem = slidingWindowCache.get(sessionId);
        if (mem != null) mem.setStatus(status);
    }

    /** Rời camera quá lâu (faceLostMaxMinutes) thì tự động đóng phiên (ABANDONED). */
    @Scheduled(fixedDelay = 60_000)
    public void closeLongFaceLost() {
        LocalDateTime limit = LocalDateTime.now().minusMinutes(rewardProps.getFaceLostMaxMinutes());
        for (LearningSession s : sessionRepository.findFaceLostBefore(limit)) {
            try {
                if (s.getUser() != null) {
                    finish(s.getId(), true, s.getUser().getId());
                }
            } catch (Exception ex) {
                log.warn("Không đóng được phiên rời cam quá lâu {}: {}", s.getId(), ex.toString());
            }
        }
    }

    /** Khởi động lại lượt xem mới khi lượt xem bị INVALID */
    @Transactional
    public VideoViewAttemptService.AttemptSnapshot restartAttempt(String sessionId, String userId) {
        LearningSession s = getOrThrow(sessionId, userId);
        attemptRepo.findOpen(userId, s.getContentItem().getId(), LocalDateTime.now().minusHours(rewardProps.getAttemptWindowHours()))
                   .forEach(a -> {
                       a.setStatus("EXPIRED");
                       a.setFinalizedAt(LocalDateTime.now());
                       attemptRepo.save(a);
                   });
        String id = attemptService.openOrGet(userId, s.getContentItem().getId());
        s.setAttemptId(id);
        sessionRepository.save(s);
        return new VideoViewAttemptService.AttemptSnapshot(id, "OPEN", 0.0, 0.0);
    }

    /**
     * Giai doan 8 & Phase R0: Tinh diem tap trung trung binh (engagement_score) cua ca buoi hoc.
     * Uu tien doc tu session_bucket_stats da duoc dong bo, chong mat du lieu khi xoa emotion_logs cu.
     */
    private float computeFocusScore(String sessionId) {
        var totals = sessionBucketStatsRepository.getTotalsBySessionId(sessionId);
        if (totals != null && totals.getTotal() != null && totals.getTotal() > 0) {
            var metrics = reportCalculationService.calculateMetrics(totals);
            return (float) metrics.focusScore();
        }

        // Fallback: tinh tu emotion_logs thuc thoi neu bucket chua duoc flush
        List<EmotionLog> validLogs = emotionLogRepository
                .findBySessionIdAndConfidenceScoreGreaterThanEqual(sessionId, 0.5f);

        if (validLogs.isEmpty()) return 0f;

        long engagedCount = validLogs.stream().filter(l -> "ENGAGED".equalsIgnoreCase(l.getLearningState())).count();
        long interestedCount = validLogs.stream().filter(l -> "INTERESTED".equalsIgnoreCase(l.getLearningState())).count();
        long neutralCount = validLogs.stream().filter(l -> "NEUTRAL".equalsIgnoreCase(l.getLearningState())).count();
        long confusedCount = validLogs.stream().filter(l -> "CONFUSED".equalsIgnoreCase(l.getLearningState())).count();
        long boredCount = validLogs.stream().filter(l -> "BORED".equalsIgnoreCase(l.getLearningState())).count();
        long noFaceCount = validLogs.stream().filter(l -> "NO_FACE".equalsIgnoreCase(l.getLearningState())).count();

        var metrics = reportCalculationService.calculateMetrics(
                validLogs.size(), engagedCount, interestedCount, neutralCount, confusedCount, boredCount, noFaceCount
        );
        return (float) metrics.focusScore();
    }

    /**
     * Giai doan 8 & Phase R0: Bao cao chi tiet sau buoi hoc (Learning Session Summary).
     * Su dung ReportCalculationService va session_bucket_stats de dong bo tuyet doi voi cac bao cao khac.
     */
    @Transactional(readOnly = true)
    public SessionSummaryDto getSessionSummary(String sessionId, String userId) {
        LearningSession session = getOrThrow(sessionId, userId);

        LocalDateTime start = session.getStartTime();
        LocalDateTime end = session.getEndTime() != null ? session.getEndTime() : LocalDateTime.now();
        long durationSec = reportCalculationService.getEffectiveStudySeconds(session);

        var totals = sessionBucketStatsRepository.getTotalsBySessionId(sessionId);
        var metrics = (totals != null && totals.getTotal() != null && totals.getTotal() > 0)
                ? reportCalculationService.calculateMetrics(totals)
                : computeFallbackMetricsFromLogs(sessionId);

        long suggestionsCount = adaptiveSuggestionRepository.countBySessionId(sessionId);

        double score = metrics.focusScore();
        String advice;
        if (score >= 80.0) {
            advice = "Xuất sắc! Bạn đã duy trì mức độ tập trung và tiếp thu rất cao (" + score + "%). Hãy tiếp tục giữ vững phong độ này nhé!";
        } else if (score >= 60.0) {
            advice = "Khá tốt! Bạn đã theo dõi phần lớn nội dung bài giảng (" + score + "%). Bạn có thể xem lại những đoạn có dấu hiệu bối rối để ghi nhớ kiến thức sâu hơn.";
        } else {
            advice = "Buổi học này có vẻ khá thử thách hoặc bạn đang có dấu hiệu mệt mỏi (" + score + "%). Hãy tạm nghỉ ít phút và thử xem lại bài giảng sau nhé!";
        }

        String lessonTitle = session.getContentItem() != null ? session.getContentItem().getTitle() : "Bài giảng Video";
        String contentItemId = session.getContentItem() != null ? session.getContentItem().getId() : null;

        return new SessionSummaryDto(
                session.getId(),
                contentItemId,
                lessonTitle,
                session.getStatus(),
                start,
                end,
                durationSec,
                score,
                session.getFocusScore() != null ? session.getFocusScore() : score,
                metrics.totalSamples(),
                metrics.engagedPercent(),
                metrics.interestedPercent(),
                metrics.confusedPercent(),
                metrics.boredPercent(),
                metrics.noFacePercent(),
                suggestionsCount,
                advice
        );
    }

    private com.elearning.emotion.service.report.ReportCalculationService.EmotionMetrics computeFallbackMetricsFromLogs(String sessionId) {
        List<EmotionLog> logs = emotionLogRepository.findBySessionId(sessionId);
        long engagedCount = logs.stream().filter(l -> "ENGAGED".equalsIgnoreCase(l.getLearningState())).count();
        long interestedCount = logs.stream().filter(l -> "INTERESTED".equalsIgnoreCase(l.getLearningState())).count();
        long neutralCount = logs.stream().filter(l -> "NEUTRAL".equalsIgnoreCase(l.getLearningState())).count();
        long confusedCount = logs.stream().filter(l -> "CONFUSED".equalsIgnoreCase(l.getLearningState())).count();
        long boredCount = logs.stream().filter(l -> "BORED".equalsIgnoreCase(l.getLearningState())).count();
        long noFaceCount = logs.stream().filter(l -> "NO_FACE".equalsIgnoreCase(l.getLearningState())).count();

        return reportCalculationService.calculateMetrics(
                logs.size(), engagedCount, interestedCount, neutralCount, confusedCount, boredCount, noFaceCount
        );
    }

    public LearningSession getOrThrow(String sessionId, String userId) {
        LearningSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay phien hoc"));
        if (userId == null || !session.getUser().getId().equals(userId)) {
            throw new SecurityException("Ban khong co quyen thao tac tren phien hoc nay");
        }
        return session;
    }
}
