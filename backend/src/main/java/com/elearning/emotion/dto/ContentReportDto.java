package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ContentReport;

import java.time.LocalDateTime;

public record ContentReportDto(
        String id,
        String reporterId,
        String reporterName,
        String reporterEmail,
        String targetType,
        String targetId,
        String reason,
        String description,
        String status,
        String adminNote,
        String handledByName,
        LocalDateTime handledAt,
        LocalDateTime createdAt
) {
    public static ContentReportDto from(ContentReport r) {
        return new ContentReportDto(
                r.getId(),
                r.getReporter() != null ? r.getReporter().getId() : null,
                r.getReporter() != null ? r.getReporter().getFullName() : null,
                r.getReporter() != null ? r.getReporter().getEmail() : null,
                r.getTargetType(),
                r.getTargetId(),
                r.getReason(),
                r.getDescription(),
                r.getStatus(),
                r.getAdminNote(),
                r.getHandledBy() != null ? r.getHandledBy().getFullName() : null,
                r.getHandledAt(),
                r.getCreatedAt()
        );
    }
}
