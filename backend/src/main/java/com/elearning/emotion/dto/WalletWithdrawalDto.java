package com.elearning.emotion.dto;

import com.elearning.emotion.entity.WalletWithdrawal;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletWithdrawalDto(
        String id,
        String userId,
        BigDecimal amount,
        BigDecimal fromCash,
        BigDecimal fromBonus,
        String bankId,
        String bankAccountNo,
        String bankAccountName,
        String status,
        String adminNote,
        String transactionRef,
        String processedBy,
        LocalDateTime processedAt,
        LocalDateTime createdAt
) {
    public static WalletWithdrawalDto from(WalletWithdrawal w) {
        if (w == null) return null;
        return new WalletWithdrawalDto(
                w.getId(),
                w.getUserId(),
                w.getAmount(),
                w.getFromCash(),
                w.getFromBonus(),
                w.getBankId(),
                w.getBankAccountNo(),
                w.getBankAccountName(),
                w.getStatus(),
                w.getAdminNote(),
                w.getTransactionRef(),
                w.getProcessedBy(),
                w.getProcessedAt(),
                w.getCreatedAt()
        );
    }
}
