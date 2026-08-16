package com.elearning.emotion.service.emotion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Implementation TAM THOI, dung khi chua co AI service that (ban dau, demo, unit test).
 * Sinh nhan cam xuc gia lap (thien ve tich cuc/trung tinh de focus_score hop ly khi demo).
 *
 * Bat/tat bang bien moi truong EMOTION_CLIENT=mock (mac dinh) | rest
 * Xem AiServiceRestClient de biet cach chuyen sang goi AI that.
 */
@Component
@Primary
public class MockEmotionRecognitionClient implements EmotionRecognitionClient {

    private static final List<String> LABELS = List.of(
            "neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised");
    private static final Random RANDOM = new Random();

    @Value("${app.emotion.mock.model-version:mock-dev-v0}")
    private String modelVersion;

    @Override
    public List<EmotionPrediction> predictBatch(List<String> base64Images) {
        return base64Images.stream().map(img -> fakeOne()).collect(Collectors.toList());
    }

    private EmotionPrediction fakeOne() {
        // thien ve happy/neutral ~70% de gan voi hanh vi thuc te khi demo
        String label = RANDOM.nextDouble() < 0.7
                ? (RANDOM.nextBoolean() ? "happy" : "neutral")
                : LABELS.get(RANDOM.nextInt(LABELS.size()));

        Map<String, Float> rawScores = new LinkedHashMap<>();
        float remaining = 1f;
        for (String l : LABELS) {
            if (l.equals(label)) continue;
            float v = (float) (RANDOM.nextDouble() * 0.1);
            rawScores.put(l, v);
            remaining -= v;
        }
        rawScores.put(label, Math.max(remaining, 0.5f));

        return new EmotionPrediction(label, rawScores.get(label), rawScores, modelVersion);
    }
}
