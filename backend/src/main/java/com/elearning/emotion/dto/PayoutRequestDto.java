package com.elearning.emotion.dto;

import com.elearning.emotion.entity.PayoutRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PayoutRequestDto(
        String id,
        String teacherId,
        String teacherName,
        String teacherEmail,
        BigDecimal amount,
        String bankId,
        String bankAccountNo,
        String bankAccountName,
        String status,
        String adminNote,
        String transactionRef,
        LocalDateTime processedAt,
        String processedByName,
        LocalDateTime createdAt
) {
    public static PayoutRequestDto from(PayoutRequest r) {
        return new PayoutRequestDto(
                r.getId(),
                r.getTeacher() != null ? r.getTeacher().getId() : null,
                r.getTeacher() != null ? r.getTeacher().getFullName() : null,
                r.getTeacher() != null ? r.getTeacher().getEmail() : null,
                r.getAmount(),
                r.getBankId(),
                r.getBankAccountNo(),
                r.getBankAccountName(),
                r.getStatus(),
                r.getAdminNote(),
                r.getTransactionRef(),
                r.getProcessedAt(),
                r.getProcessedBy() != null ? r.getProcessedBy().getFullName() : null,
                r.getCreatedAt()
        );
    }
}
