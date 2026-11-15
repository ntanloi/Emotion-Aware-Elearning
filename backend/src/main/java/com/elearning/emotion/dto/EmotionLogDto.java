package com.elearning.emotion.dto;

public record EmotionLogDto(
        String id,
        String emotionLabel,
        String learningState,
        float confidenceScore,
        String modelVersion,
        Float videoTimeSec
) {
    public EmotionLogDto(String id, String emotionLabel, float confidenceScore, String modelVersion) {
        this(id, emotionLabel, "ENGAGED", confidenceScore, modelVersion, null);
    }
}
