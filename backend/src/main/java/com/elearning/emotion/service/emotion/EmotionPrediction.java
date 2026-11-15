package com.elearning.emotion.service.emotion;

import java.util.List;
import java.util.Map;

/**
 * Ket qua nhan dien cam xuc va trang thai hoc tap cho 1 khung hinh,
 * phuc vu tinh nang nhan dien da tin hieu (Phase B2 KLTN).
 */
public record EmotionPrediction(
        String emotionLabel,      // neutral|happy|sad|angry|fearful|disgusted|surprised|no_face
        String learningState,     // ENGAGED|INTERESTED|CONFUSED|BORED|NEUTRAL|NO_FACE
        float confidenceScore,
        Map<String, Float> rawScores,
        String modelVersion,
        Float videoTimeSec,
        List<String> cues          // dau hieu AI dang kich hoat (chi de hien thi/debug), co the null
) {
    // Constructor 6 tham so (khong co cues):
    public EmotionPrediction(String emotionLabel, String learningState, float confidenceScore, Map<String, Float> rawScores, String modelVersion, Float videoTimeSec) {
        this(emotionLabel, learningState, confidenceScore, rawScores, modelVersion, videoTimeSec, null);
    }

    // Constructor 5 tham so:
    public EmotionPrediction(String emotionLabel, String learningState, float confidenceScore, Map<String, Float> rawScores, String modelVersion) {
        this(emotionLabel, learningState, confidenceScore, rawScores, modelVersion, null, null);
    }

    // Constructor 4 tham so cu de tuong thich 100% voi cac cho chua kip truyen learningState:
    public EmotionPrediction(String emotionLabel, float confidenceScore, Map<String, Float> rawScores, String modelVersion) {
        this(emotionLabel, mapDefaultLearningState(emotionLabel), confidenceScore, rawScores, modelVersion, null, null);
    }

    public static String mapDefaultLearningState(String emotion) {
        if (emotion == null) return "ENGAGED";
        String e = emotion.toLowerCase();
        return switch (e) {
            case "no_face" -> "NO_FACE";
            case "happy", "surprised" -> "INTERESTED";
            case "sad", "fearful" -> "CONFUSED";
            case "disgusted", "angry" -> "BORED";
            default -> "ENGAGED";
        };
    }
}
