package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Notification;
import java.time.LocalDateTime;

public record NotificationDto(
        String id,
        String title,
        String content,
        String type,
        String referenceId,
        String link,
        boolean isRead,
        LocalDateTime createdAt
) {
    public static NotificationDto from(Notification n) {
        if (n == null) return null;
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getContent(),
                n.getType(),
                n.getReferenceId(),
                n.getLink(),
                Boolean.TRUE.equals(n.getIsRead()),
                n.getCreatedAt()
        );
    }
}
