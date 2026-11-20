package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SepayPayoutCheckResult(
        boolean matched,
        String message,
        Checks checks,
        SepayTransactionInfo transaction
) {
    public record Checks(
            boolean amountMatched,
            BigDecimal expectedAmount,
            BigDecimal actualAmount,
            boolean teacherCodeMatched,
            String expectedTeacherCode,
            boolean bankAccountMatched,
            String expectedBankAccount
    ) {}

    public record SepayTransactionInfo(
            Long sepayId,
            String referenceCode,
            BigDecimal transferAmount,
            String transferType,
            String content,
            String description,
            LocalDateTime transactionDate,
            String accountNumber
    ) {}

    public static SepayPayoutCheckResult failure(String message, Checks checks, SepayTransactionInfo tx) {
        return new SepayPayoutCheckResult(false, message, checks, tx);
    }

    public static SepayPayoutCheckResult success(String message, Checks checks, SepayTransactionInfo tx) {
        return new SepayPayoutCheckResult(true, message, checks, tx);
    }
}
