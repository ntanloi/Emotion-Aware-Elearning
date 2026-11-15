package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "order_code", nullable = false, unique = true, length = 50)
    private String orderCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_amount", precision = 12, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "payment_method", nullable = false, length = 30)
    @Builder.Default
    private String paymentMethod = "VIETQR";

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Column(name = "reward_escrow_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal rewardEscrowAmount = BigDecimal.ZERO;

    @Column(name = "fee_percent", precision = 5, scale = 2)
    private BigDecimal feePercent;

    @Column(name = "escrow_percent", precision = 5, scale = 2)
    private BigDecimal escrowPercent;

    @Column(name = "policy_version", length = 20)
    private String policyVersion;

    @Column(name = "reward_terms_accepted_at")
    private LocalDateTime rewardTermsAcceptedAt;

    @Column(name = "access_months")
    private Integer accessMonths;

    @Column(name = "teacher_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal teacherAmount = BigDecimal.ZERO;

    /** PENDING | PAID | CANCELLED | EXPIRED | REFUNDED (Dữ liệu lịch sử, hệ thống mới không áp dụng hoàn tiền) */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "qr_url", columnDefinition = "TEXT")
    private String qrUrl;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "refund_ref_code", length = 100)
    private String refundRefCode;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
