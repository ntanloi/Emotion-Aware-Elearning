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
        String content,
        String status,
        String orderId,
        String orderCode,
        String adminNote,
        LocalDateTime createdAt
) {
    public static PaymentTransactionDto from(PaymentTransaction tx) {
        return new PaymentTransactionDto(
                tx.getId(),
                tx.getSepayId(),
                tx.getGateway(),
                tx.getTransactionDate(),
                tx.getAccountNumber(),
                tx.getTransferType(),
                tx.getTransferAmount(),
                tx.getCode(),
                tx.getContent(),
                tx.getStatus(),
                tx.getOrder() != null ? tx.getOrder().getId() : null,
                tx.getOrder() != null ? tx.getOrder().getOrderCode() : null,
                tx.getAdminNote(),
                tx.getCreatedAt()
        );
    }
}
