package com.elearning.emotion.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private String id;
    private String sender;
    private String content;
    private LocalDateTime createdAt;
    private String model;
    private Integer promptTokens;
    private Integer completionTokens;
}
