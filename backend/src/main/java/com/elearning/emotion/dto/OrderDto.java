package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Order;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class OrderDto {
    String id;
    String orderCode;
    String courseId;
    String courseTitle;
    String courseLevel;
    String teacherName;
    String studentName;
    String studentEmail;
    BigDecimal amount;
    BigDecimal paidAmount;
    BigDecimal platformFee;
    BigDecimal teacherAmount;
    String status;
    String qrUrl;
    String bankId;
    String accountNo;
    String accountName;
    LocalDateTime paidAt;
    LocalDateTime refundedAt;
    String refundReason;
    String refundRefCode;
    LocalDateTime expiredAt;
    LocalDateTime createdAt;

    public static OrderDto from(Order order, String bankId, String accountNo, String accountName) {
        return from(order, bankId, accountNo, accountName, order.getQrUrl());
    }

    public static OrderDto from(Order order, String bankId, String accountNo, String accountName, String qrUrl) {
        return OrderDto.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .courseId(order.getCourse() != null ? order.getCourse().getId() : null)
                .courseTitle(order.getCourse() != null ? order.getCourse().getTitle() : null)
                .courseLevel(order.getCourse() != null ? order.getCourse().getLevel() : null)
                .teacherName(order.getCourse() != null && order.getCourse().getTeacher() != null
                        ? order.getCourse().getTeacher().getFullName() : null)
                .studentName(order.getUser() != null ? order.getUser().getFullName() : null)
                .studentEmail(order.getUser() != null ? order.getUser().getEmail() : null)
                .amount(order.getAmount())
                .paidAmount(order.getPaidAmount())
                .platformFee(order.getPlatformFee())
                .teacherAmount(order.getTeacherAmount())
                .status(order.getStatus())
                .qrUrl(qrUrl != null ? qrUrl : order.getQrUrl())
                .bankId(bankId)
                .accountNo(accountNo)
                .accountName(accountName)
                .paidAt(order.getPaidAt())
                .refundedAt(order.getRefundedAt())
                .refundReason(order.getRefundReason())
                .refundRefCode(order.getRefundRefCode())
                .expiredAt(order.getExpiredAt())
                .createdAt(order.getCreatedAt())
                .build();
    }
}
