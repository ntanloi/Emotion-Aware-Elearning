package com.elearning.emotion.service.emotion;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Implementation MOCK Phase B2 KLTN:
 * Sinh nhan cam xuc & trang thai hoc tap gia lap gan voi thuc te hoc tap.
 * Phan bo mac dinh: ~55% ENGAGED, ~20% INTERESTED, ~15% CONFUSED, ~10% BORED.
 */
@Component
@ConditionalOnProperty(prefix = "app.ai-service", name = "mock", havingValue = "true", matchIfMissing = false)
public class MockEmotionRecognitionClient implements EmotionRecognitionClient {

    private static final List<String> LABELS = List.of(
            "neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised");
    private static final Random RANDOM = new Random();

    @Value("${app.emotion.mock.model-version:mock-lstate-v1}")
    private String modelVersion;

    @Override
    public List<EmotionPrediction> predictBatch(List<String> base64Images) {
        return base64Images.stream().map(this::predictSingle).collect(Collectors.toList());
    }

    private EmotionPrediction predictSingle(String base64Img) {
        if (isImageBlank(base64Img)) {
            Map<String, Float> noFaceScores = new LinkedHashMap<>();
            LABELS.forEach(l -> noFaceScores.put(l, 0.0f));
            return new EmotionPrediction("no_face", "NO_FACE", 0.95f, noFaceScores, modelVersion);
        }
        return fakeOne();
    }

    private boolean isImageBlank(String base64Img) {
        if (base64Img == null || base64Img.isBlank()) return true;
        try {
            String raw = base64Img.contains(",") ? base64Img.substring(base64Img.indexOf(",") + 1) : base64Img;
            byte[] bytes = java.util.Base64.getDecoder().decode(raw);
            java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            if (img == null) return true;

            int w = img.getWidth();
            int h = img.getHeight();
            if (w < 10 || h < 10) return true;

            long totalLuma = 0;
            int step = 6;
            int count = 0;
            for (int y = 0; y < h; y += step) {
                for (int x = 0; x < w; x += step) {
                    int rgb = img.getRGB(x, y);
                    int r = (rgb >> 16) & 0xff;
                    int g = (rgb >> 8) & 0xff;
                    int b = rgb & 0xff;
                    totalLuma += (r * 299 + g * 587 + b * 114) / 1000;
                    count++;
                }
            }
            float avgLuma = count > 0 ? (float) totalLuma / count : 0;
            return avgLuma < 12.0f; // Khung hình đen hoàn toàn
        } catch (Exception ex) {
            return false;
        }
    }

    private EmotionPrediction fakeOne() {
        double r = RANDOM.nextDouble();
        String learningState;
        String emotionLabel;

        if (r < 0.55) {
            learningState = "ENGAGED";
            emotionLabel = "neutral";
        } else if (r < 0.75) {
            learningState = "INTERESTED";
            emotionLabel = RANDOM.nextBoolean() ? "happy" : "surprised";
        } else if (r < 0.90) {
            learningState = "CONFUSED";
            emotionLabel = RANDOM.nextBoolean() ? "sad" : "fearful";
        } else {
            learningState = "BORED";
            emotionLabel = RANDOM.nextBoolean() ? "disgusted" : "neutral";
        }

        Map<String, Float> rawScores = new LinkedHashMap<>();
        float remaining = 1f;
        for (String l : LABELS) {
            if (l.equals(emotionLabel)) continue;
            float v = (float) (RANDOM.nextDouble() * 0.08);
            rawScores.put(l, v);
            remaining -= v;
        }
        rawScores.put(emotionLabel, Math.max(remaining, 0.6f));

        return new EmotionPrediction(
                emotionLabel,
                learningState,
                rawScores.get(emotionLabel),
                rawScores,
                modelVersion
        );
    }
}
