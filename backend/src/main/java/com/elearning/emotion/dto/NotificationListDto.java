package com.elearning.emotion.dto;

import java.util.List;

public record NotificationListDto(
        List<NotificationDto> notifications,
        long unreadCount
) {
}
