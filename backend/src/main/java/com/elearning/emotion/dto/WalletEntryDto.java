package com.elearning.emotion.dto;

import com.elearning.emotion.entity.WalletEntry;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletEntryDto(
        String id,
        String userId,
        String type,
        String bucket,
        BigDecimal amount,
        BigDecimal cashAfter,
        BigDecimal bonusAfter,
        String paymentTransactionId,
        String orderId,
        String escrowId,
        String withdrawalId,
        String description,
        LocalDateTime createdAt
) {
    public static WalletEntryDto from(WalletEntry e) {
        if (e == null) return null;
        return new WalletEntryDto(
                e.getId(),
                e.getUserId(),
                e.getType(),
                e.getBucket(),
                e.getAmount(),
                e.getCashAfter(),
                e.getBonusAfter(),
                e.getPaymentTransactionId(),
                e.getOrderId(),
                e.getEscrowId(),
                e.getWithdrawalId(),
                e.getDescription(),
                e.getCreatedAt()
        );
    }
}
