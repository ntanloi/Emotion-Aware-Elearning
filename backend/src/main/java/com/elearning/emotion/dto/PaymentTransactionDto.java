package com.elearning.emotion.dto;

import com.elearning.emotion.entity.PaymentTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentTransactionDto(
        String id,
        Long sepayId,
        String gateway,
        LocalDateTime transactionDate,
        String accountNumber,
        String transferType,
        BigDecimal transferAmount,
        String code,
        String referenceCode,
        String content,
        String status,
        String orderId,
        String orderCode,
        String payoutRequestId,
        String payoutTeacherName,
        String adminNote,
        LocalDateTime createdAt
) {
    public static PaymentTransactionDto from(PaymentTransaction tx) {
        String teacherName = null;
        if (tx.getPayoutRequest() != null && tx.getPayoutRequest().getTeacher() != null) {
            teacherName = tx.getPayoutRequest().getTeacher().getFullName();
        }
        return new PaymentTransactionDto(
                tx.getId(),
                tx.getSepayId(),
                tx.getGateway(),
                tx.getTransactionDate(),
                tx.getAccountNumber(),
                tx.getTransferType(),
                tx.getTransferAmount(),
                tx.getCode(),
                tx.getReferenceCode(),
                tx.getContent(),
                tx.getStatus(),
                tx.getOrder() != null ? tx.getOrder().getId() : null,
                tx.getOrder() != null ? tx.getOrder().getOrderCode() : null,
                tx.getPayoutRequest() != null ? tx.getPayoutRequest().getId() : null,
                teacherName,
                tx.getAdminNote(),
                tx.getCreatedAt()
        );
    }
}
