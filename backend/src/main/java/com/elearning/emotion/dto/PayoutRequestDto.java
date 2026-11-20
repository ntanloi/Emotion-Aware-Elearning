package com.elearning.emotion.dto;

import com.elearning.emotion.entity.PaymentTransaction;
import com.elearning.emotion.entity.PayoutRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PayoutRequestDto(
        String id,
        String teacherId,
        String teacherCode,
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
        LocalDateTime createdAt,
        Boolean sepayMatched,
        Long sepayTransactionId,
        String sepayReferenceCode
) {
    public static PayoutRequestDto from(PayoutRequest r) {
        return from(r, null);
    }

    public static PayoutRequestDto from(PayoutRequest r, PaymentTransaction tx) {
        String tCode = r.getTeacher() != null ? r.getTeacher().getTeacherCode() : null;
        return new PayoutRequestDto(
                r.getId(),
                r.getTeacher() != null ? r.getTeacher().getId() : null,
                tCode,
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
                r.getCreatedAt(),
                tx != null,
                tx != null ? tx.getSepayId() : null,
                tx != null ? tx.getReferenceCode() : null
        );
    }
}
