package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletDto(
        BigDecimal cashBalance,
        BigDecimal bonusBalance,
        BigDecimal total,
        String topupCode,
        String qrUrl,
        String bankId,
        String bankName,
        String accountNo,
        String accountName,
        BigDecimal withdrawableAmount,
        BigDecimal lockedCashAmount,
        LocalDateTime nextUnlockAt
) {}
