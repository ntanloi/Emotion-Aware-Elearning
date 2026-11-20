package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Order;
import com.elearning.emotion.entity.TeacherWalletEntry;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Một dòng sổ cái ví giảng viên.
 *
 * Với dòng SALE, tách rõ: grossAmount (100% học phí) - platformFeeAmount (phí nền tảng)
 * - escrowAmount (giữ hộ) = amount (thực nhận). Các giá trị này luôn không âm; giao diện tự hiển thị dấu trừ.
 * Với dòng không phải SALE, ba trường tách tiền là null.
 */
public record TeacherWalletEntryDto(
        String id,
        String type,
        BigDecimal amount,
        LocalDateTime availableAt,
        String description,
        LocalDateTime createdAt,
        String orderCode,
        String courseTitle,
        BigDecimal grossAmount,
        BigDecimal platformFeeAmount,
        BigDecimal escrowAmount
) {
    public static TeacherWalletEntryDto from(TeacherWalletEntry entry) {
        Order order = entry.getOrder();
        String code = order != null ? order.getOrderCode() : null;
        String title = (order != null && order.getCourse() != null) ? order.getCourse().getTitle() : null;

        BigDecimal gross = null;
        BigDecimal fee = null;
        BigDecimal escrow = null;
        if ("SALE".equals(entry.getType()) && order != null) {
            fee = nz(order.getPlatformFee());
            escrow = nz(order.getRewardEscrowAmount());
            // Thực nhận = amount của dòng sổ cái; gross = thực nhận + phí + giữ hộ để 4 cột luôn cộng/trừ khớp nhau
            gross = entry.getAmount().add(fee).add(escrow);
        }
        return new TeacherWalletEntryDto(
                entry.getId(),
                entry.getType(),
                entry.getAmount(),
                entry.getAvailableAt(),
                entry.getDescription(),
                entry.getCreatedAt(),
                code,
                title,
                gross,
                fee,
                escrow
        );
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
