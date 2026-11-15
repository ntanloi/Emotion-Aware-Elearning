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
public class ChatConversationDto {
    private String id;
    private String contextType;
    private String contextRefId;
    private String title;
    private LocalDateTime startedAt;
}
