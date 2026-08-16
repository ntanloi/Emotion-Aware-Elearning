package com.elearning.emotion.service.emotion;

import java.util.Map;

/**
 * Ket qua nhan dien cam xuc cho 1 khung hinh, khong phu thuoc vao viec
 * nguon la face-api.js, model tu train, hay mock.
 */
public record EmotionPrediction(
        String emotionLabel,      // neutral|happy|sad|angry|fearful|disgusted|surprised|no_face
        float confidenceScore,
        Map<String, Float> rawScores,
        String modelVersion
) {}
