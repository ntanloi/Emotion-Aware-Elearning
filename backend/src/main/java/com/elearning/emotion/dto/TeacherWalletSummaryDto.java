package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TeacherWalletSummaryDto(
        BigDecimal availableBalance,
        BigDecimal totalPaidOut,
        BigDecimal pendingPayoutAmount,
        BigDecimal pendingRewardAmount,
        BigDecimal minPayoutAmount,
        boolean hasPendingPayoutRequest,
        String bankId,
        String bankAccountNo,
        String bankAccountName,
        // --- mới ---
        BigDecimal totalEarned,          // thực nhận (SALE + RELEASE + REFUND)
        BigDecimal grossSales,           // doanh số 100%
        BigDecimal platformFeeTotal,     // tổng phí nền tảng
        BigDecimal rewardClaimedAmount,  // phần học viên đã nhận thưởng
        long holdingCount,               // số khoản đang giữ
        LocalDateTime nextHoldingDue     // hạn gần nhất, có thể null
) {}
