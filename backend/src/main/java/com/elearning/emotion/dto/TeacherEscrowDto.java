package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TeacherEscrowDto(
        String id,
        String orderId,
        String courseId,
        String courseTitle,
        BigDecimal amount,
        String status,            // HOLDING | CLAIMED | RELEASED
        LocalDateTime holdingUntil,
        LocalDateTime settledAt,
        LocalDateTime createdAt
) {}
