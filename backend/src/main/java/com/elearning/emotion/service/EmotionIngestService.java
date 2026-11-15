package com.elearning.emotion.service;

import com.elearning.emotion.dto.AdaptiveSuggestionDto;
import com.elearning.emotion.dto.EmotionBatchFramesRequest;
import com.elearning.emotion.dto.EmotionBatchFramesResponseDto;
import com.elearning.emotion.dto.EmotionBatchLabeledRequest;
import com.elearning.emotion.dto.EmotionLogDto;
import com.elearning.emotion.entity.AiModel;
import com.elearning.emotion.entity.EmotionLog;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.AiModelRepository;
import com.elearning.emotion.repository.EmotionLogRepository;
import com.elearning.emotion.repository.LearningSessionRepository;
import com.elearning.emotion.service.emotion.EmotionPrediction;
import com.elearning.emotion.service.emotion.EmotionRecognitionClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Noi ghi nhan Dong cam xuc (EMOTION_LOGS) - ho tro CA 2 che do dau vao:
 *  1) ingestLabeled(): client da tu tinh nhan san (vd face-api.js chay trong browser).
 *  2) ingestFrames(): client gui anh tho, service nay goi EmotionRecognitionClient (interface)
 *     de suy luan qua AI Service va danh gia Adaptive Suggestions (Giai doan 8).
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EmotionIngestService {

    private final EmotionRecognitionClient emotionRecognitionClient;
    private final EmotionLogRepository emotionLogRepository;
    private final LearningSessionRepository sessionRepository;
    private final AiModelRepository aiModelRepository;
    private final AdaptiveSuggestionService adaptiveSuggestionService;
    private final com.elearning.emotion.service.emotion.SessionSlidingWindowCache slidingWindowCache;
    private final com.elearning.emotion.service.emotion.EmotionLogWriter emotionLogWriter;
    private final com.elearning.emotion.service.emotion.FaceLostTracker faceLostTracker;
    private final com.elearning.emotion.config.RewardProperties rewardProps;
    private final VideoViewAttemptService attemptService;
    private final LearningSessionService sessionService;

    private final java.util.Map<String, AiModel> modelCache = new java.util.concurrent.ConcurrentHashMap<>();

    public EmotionBatchFramesResponseDto ingestFrames(String sessionId, EmotionBatchFramesRequest req, String userId) {
        var state = ensureSessionState(sessionId, userId);
        String contentItemId = state.getContentItemId();
        String sessionUserId = state.getUserId();

        List<EmotionPrediction> predictions = emotionRecognitionClient.predictBatch(sessionId, req.images());

        List<EmotionLogDto> logs = predictions.stream().map(p -> {
            AiModel model = resolveOrCreateModel(p.modelVersion());
            String lState = p.learningState() != null ? p.learningState() : EmotionPrediction.mapDefaultLearningState(p.emotionLabel());
            Float vTime = req.videoTimeSec() != null ? req.videoTimeSec() : p.videoTimeSec();
            String logId = java.util.UUID.randomUUID().toString();

            // 1. Cập nhật cửa sổ trượt trong RAM tức thì (<0.1ms)
            state.addFrame(lState, vTime);

            // 2. Đưa vào hàng đợi ghi bất đồng bộ (không chặn luồng HTTP của học viên)
            emotionLogWriter.enqueue(new com.elearning.emotion.service.emotion.EmotionLogWriter.EmotionLogRow(
                    logId,
                    sessionId,
                    contentItemId,
                    sessionUserId,
                    model != null ? model.getId() : null,
                    LocalDateTime.now(),
                    p.emotionLabel(),
                    lState,
                    p.confidenceScore(),
                    vTime
            ));

            return new EmotionLogDto(logId, p.emotionLabel(), lState, p.confidenceScore(), p.modelVersion(), vTime);
        }).toList();

        // 3. Đánh giá gợi ý thích ứng từ bộ nhớ RAM (độ trễ siêu thấp)
        AdaptiveSuggestionDto suggestion = adaptiveSuggestionService.evaluateSuggestions(sessionId, state.getStatus(), req.videoTimeSec());

        // 4. Cập nhật thời gian học thực tế active_seconds (giới hạn 10s/lần)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastTouch = state.getLastTouchAt();
        if (lastTouch == null || java.time.Duration.between(lastTouch, now).getSeconds() >= 10) {
            sessionRepository.touchSessionActivity(sessionId, now);
            state.setLastTouchAt(now);
        }

        // 5. Theo dõi có mặt camera (FACE_LOST) và lượt xem video hợp lệ (VideoViewAttempt)
        boolean anyFace = logs.stream().anyMatch(l -> !"NO_FACE".equalsIgnoreCase(l.learningState()));
        boolean allNoFace = !logs.isEmpty() && !anyFace;
        String sessionStatus = state.getStatus();
        VideoViewAttemptService.AttemptSnapshot attemptSnap = null;

        if ("LEARNING".equals(sessionStatus) || "FACE_LOST".equals(sessionStatus)) {
            String next = faceLostTracker.update(sessionId, anyFace, allNoFace) ? "FACE_LOST" : "LEARNING";
            if (!next.equals(sessionStatus)) {
                sessionService.markStatus(sessionId, next);
                sessionStatus = next;
            }
            if ("FACE_LOST".equals(sessionStatus)) {
                // Đã có cơ chế tự tạm dừng video, không sinh gợi ý cảnh báo rời cam
                suggestion = null;
            }
            if (rewardProps.isTrackingEnabled()) {
                try {
                    String attemptId = sessionRepository.findAttemptId(sessionId);
                    if (attemptId != null) {
                        var samples = logs.stream()
                                .map(l -> new VideoViewAttemptService.Sample(l.learningState(), l.videoTimeSec(), l.confidenceScore()))
                                .toList();
                        attemptSnap = attemptService.applyBatch(
                                attemptId,
                                samples,
                                req.playbackRate() != null ? req.playbackRate() : 1.0,
                                req.videoDurationSec()
                        );
                    }
                } catch (Exception ex) {
                    // theo dõi lỗi không được làm hỏng luồng nhận diện
                    log.warn("Theo dõi lượt xem lỗi (session {}): {}", sessionId, ex.toString());
                }
            }
        }

        return new EmotionBatchFramesResponseDto(logs, suggestion, buildDebug(predictions), sessionStatus, attemptSnap);
    }

    /**
     * Diem cac trang thai cua khung MOI NHAT de frontend ve thanh cam xuc khi test.
     * ai-service tra raw_emotion_scores: neutral=tap trung, happy=hung thu, fearful=boi roi, sad=chan.
     */
    private static java.util.Map<String, Object> buildDebug(List<EmotionPrediction> predictions) {
        if (predictions == null || predictions.isEmpty()) return null;
        EmotionPrediction last = predictions.get(predictions.size() - 1);
        java.util.Map<?, ?> rs = last.rawScores();
        if (rs == null || rs.isEmpty()) return null;
        java.util.Map<String, Object> dbg = new java.util.LinkedHashMap<>();
        dbg.put("focused", num(rs, "neutral"));
        dbg.put("interested", num(rs, "happy"));
        dbg.put("confused", num(rs, "fearful"));
        dbg.put("bored", num(rs, "sad"));
        dbg.put("state", last.learningState());
        dbg.put("confidence", last.confidenceScore());
        dbg.put("cues", last.cues() != null ? last.cues() : List.of());
        dbg.put("modelVersion", last.modelVersion());
        return dbg;
    }

    private static double num(java.util.Map<?, ?> m, String key) {
        Object v = m.get(key);
        return v instanceof Number n ? n.doubleValue() : 0.0;
    }

    /** Che do legacy: client (vd face-api.js) da tinh san nhan, chi luu lai. */
    public List<EmotionLogDto> ingestLabeled(String sessionId, EmotionBatchLabeledRequest req, String userId) {
        var state = ensureSessionState(sessionId, userId);
        AiModel legacyModel = resolveOrCreateModel("face-api.js");
        String contentItemId = state.getContentItemId();
        String sessionUserId = state.getUserId();

        List<EmotionLogDto> result = req.entries().stream().map(entry -> {
            String lState = EmotionPrediction.mapDefaultLearningState(entry.emotionLabel());
            String logId = java.util.UUID.randomUUID().toString();

            state.addFrame(lState, null);

            emotionLogWriter.enqueue(new com.elearning.emotion.service.emotion.EmotionLogWriter.EmotionLogRow(
                    logId,
                    sessionId,
                    contentItemId,
                    sessionUserId,
                    legacyModel != null ? legacyModel.getId() : null,
                    LocalDateTime.now(),
                    entry.emotionLabel(),
                    lState,
                    entry.confidenceScore(),
                    null
            ));

            return new EmotionLogDto(logId, entry.emotionLabel(), lState, entry.confidenceScore(),
                    legacyModel != null ? legacyModel.getVersion() : "unknown", null);
        }).toList();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastTouch = state.getLastTouchAt();
        if (lastTouch == null || java.time.Duration.between(lastTouch, now).getSeconds() >= 10) {
            sessionRepository.touchSessionActivity(sessionId, now);
            state.setLastTouchAt(now);
        }
        return result;
    }

    private com.elearning.emotion.service.emotion.SessionSlidingWindowCache.SessionMemoryState ensureSessionState(String sessionId, String userId) {
        var state = slidingWindowCache.getOrCreate(sessionId);
        if (!state.isMetadataLoaded()) {
            LearningSession session = getSessionOrThrow(sessionId, userId);
            String contentItemId = session.getContentItem() != null ? session.getContentItem().getId() : null;
            String courseId = (session.getContentItem() != null && session.getContentItem().getCourse() != null)
                    ? session.getContentItem().getCourse().getId() : null;
            String teacherId = (session.getContentItem() != null && session.getContentItem().getCourse() != null
                    && session.getContentItem().getCourse().getTeacher() != null)
                    ? session.getContentItem().getCourse().getTeacher().getId() : null;
            String sessionUserId = session.getUser() != null ? session.getUser().getId() : userId;

            state.initMetadata(sessionId, sessionUserId, contentItemId, courseId, teacherId, session.getStatus());
            if (teacherId != null) {
                slidingWindowCache.registerTeacherSession(teacherId, sessionId);
            }
        } else {
            if (userId == null || !userId.equals(state.getUserId())) {
                throw new SecurityException("Ban khong co quyen gui du lieu cam xuc cho phien hoc nay");
            }
            if ("FINISHED".equals(state.getStatus()) || "ABANDONED".equals(state.getStatus())) {
                throw new IllegalStateException("Phiên học đã kết thúc, không thể gửi thêm dữ liệu cảm xúc");
            }
        }
        return state;
    }

    private AiModel resolveOrCreateModel(String version) {
        if (version == null) version = "default";
        return modelCache.computeIfAbsent(version, v ->
                aiModelRepository.findAll().stream()
                        .filter(m -> v.equals(m.getVersion()))
                        .findFirst()
                        .orElseGet(() -> aiModelRepository.save(
                                AiModel.builder().version(v).framework("pytorch").isActive(true).build()))
        );
    }

    private LearningSession getSessionOrThrow(String sessionId, String userId) {
        LearningSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay phien hoc"));
        if (userId == null || !session.getUser().getId().equals(userId)) {
            throw new SecurityException("Ban khong co quyen gui du lieu cam xuc cho phien hoc nay");
        }
        if (session.getEndTime() != null || "FINISHED".equals(session.getStatus()) || "ABANDONED".equals(session.getStatus())) {
            throw new IllegalStateException("Phiên học đã kết thúc, không thể gửi thêm dữ liệu cảm xúc");
        }
        return session;
    }
}
