package com.elearning.emotion.dto;

public record EmotionLogDto(String id, String emotionLabel, float confidenceScore, String modelVersion) {}
