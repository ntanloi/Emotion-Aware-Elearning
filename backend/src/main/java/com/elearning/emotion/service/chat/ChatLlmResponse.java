package com.elearning.emotion.service.chat;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ChatLlmResponse {
    boolean success;
    String content;
    String model;
    Integer promptTokens;
    Integer completionTokens;
    String errorMessage;

    public static ChatLlmResponse failed(String message, String model) {
        return ChatLlmResponse.builder()
                .success(false)
                .content(null)
                .model(model)
                .errorMessage(message)
                .build();
    }
}
