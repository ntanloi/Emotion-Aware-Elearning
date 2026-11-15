package com.elearning.emotion.dto;

import com.elearning.emotion.entity.TeacherWalletEntry;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TeacherWalletEntryDto(
        String id,
        String type,
        BigDecimal amount,
        LocalDateTime availableAt,
        String description,
        LocalDateTime createdAt,
        String orderCode,
        String courseTitle
) {
    public static TeacherWalletEntryDto from(TeacherWalletEntry entry) {
        String code = entry.getOrder() != null ? entry.getOrder().getOrderCode() : null;
        String title = (entry.getOrder() != null && entry.getOrder().getCourse() != null)
                ? entry.getOrder().getCourse().getTitle() : null;
        return new TeacherWalletEntryDto(
                entry.getId(),
                entry.getType(),
                entry.getAmount(),
                entry.getAvailableAt(),
                entry.getDescription(),
                entry.getCreatedAt(),
                code,
                title
        );
    }
}
