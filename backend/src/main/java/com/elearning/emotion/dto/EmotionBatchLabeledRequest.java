package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record EmotionBatchLabeledRequest(@NotEmpty List<LabeledEntry> entries) {
    public record LabeledEntry(String capturedAt, String emotionLabel, float confidenceScore) {}
}
