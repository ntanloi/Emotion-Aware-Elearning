package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TeacherEnrollmentDto(
        String orderId,
        String orderCode,
        String studentId,
        String studentName,
        String studentEmail,
        String courseId,
        String courseTitle,
        BigDecimal amount,
        LocalDateTime enrolledAt,
        String status
) {}
