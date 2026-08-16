package com.elearning.emotion.service;

import com.elearning.emotion.dto.EmotionBatchFramesRequest;
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
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Noi ghi nhan Dong cam xuc (EMOTION_LOGS) - ho tro CA 2 che do dau vao:
 *  1) ingestLabeled(): client da tu tinh nhan san (vd face-api.js chay trong browser).
 *  2) ingestFrames(): client gui anh tho, service nay goi EmotionRecognitionClient (interface)
 *     de suy luan - hien dang tro toi MockEmotionRecognitionClient, sau nay tro toi
 *     AiServiceRestClient ma KHONG can sua gi o day.
 *
 * Ca 2 deu ghi vao cung 1 bang EMOTION_LOGS, chi khac model_id de biet nguon goc (xem docs/erd.md).
 */
@Service
@RequiredArgsConstructor
public class EmotionIngestService {

    private final EmotionRecognitionClient emotionRecognitionClient;
    private final EmotionLogRepository emotionLogRepository;
    private final LearningSessionRepository sessionRepository;
    private final AiModelRepository aiModelRepository;

    public List<EmotionLogDto> ingestFrames(String sessionId, EmotionBatchFramesRequest req) {
        LearningSession session = getSessionOrThrow(sessionId);

        List<EmotionPrediction> predictions = emotionRecognitionClient.predictBatch(req.images());

        return predictions.stream().map(p -> {
            AiModel model = resolveOrCreateModel(p.modelVersion());
            EmotionLog log = EmotionLog.builder()
                    .session(session)
                    .model(model)
                    .capturedAt(LocalDateTime.now())
                    .emotionLabel(p.emotionLabel())
                    .confidenceScore(p.confidenceScore())
                    .rawScores(p.rawScores())
                    .build();
            log = emotionLogRepository.save(log);
            return new EmotionLogDto(log.getId(), log.getEmotionLabel(), log.getConfidenceScore(), p.modelVersion());
        }).toList();
    }

    /** Che do legacy: client (vd face-api.js) da tinh san nhan, chi luu lai. */
    public List<EmotionLogDto> ingestLabeled(String sessionId, EmotionBatchLabeledRequest req) {
        LearningSession session = getSessionOrThrow(sessionId);
        AiModel legacyModel = aiModelRepository.findAll().stream()
                .filter(m -> m.getVersion().startsWith("face-api.js"))
                .findFirst().orElse(null);

        return req.entries().stream().map(entry -> {
            EmotionLog log = EmotionLog.builder()
                    .session(session)
                    .model(legacyModel)
                    .capturedAt(LocalDateTime.now())
                    .emotionLabel(entry.emotionLabel())
                    .confidenceScore(entry.confidenceScore())
                    .build();
            log = emotionLogRepository.save(log);
            return new EmotionLogDto(log.getId(), log.getEmotionLabel(), log.getConfidenceScore(),
                    legacyModel != null ? legacyModel.getVersion() : "unknown");
        }).toList();
    }

    private AiModel resolveOrCreateModel(String version) {
        return aiModelRepository.findAll().stream()
                .filter(m -> m.getVersion().equals(version))
                .findFirst()
                .orElseGet(() -> aiModelRepository.save(
                        AiModel.builder().version(version).isActive(true).build()));
    }

    private LearningSession getSessionOrThrow(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay phien hoc"));
    }
}
