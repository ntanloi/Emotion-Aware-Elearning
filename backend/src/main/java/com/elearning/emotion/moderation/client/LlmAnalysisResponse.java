package com.elearning.emotion.moderation.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmAnalysisResponse {
    private String rawJson;
    private String model;
    private String promptVersion;
    private boolean success;
    private String errorMessage;

    public static LlmAnalysisResponse failed(String message, String model, String promptVersion) {
        return LlmAnalysisResponse.builder()
                .success(false)
                .errorMessage(message)
                .model(model)
                .promptVersion(promptVersion)
                .build();
    }
}
