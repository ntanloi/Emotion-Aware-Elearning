package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletEntry {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    /** TOPUP | PURCHASE | REWARD | ADJUST | WITHDRAW | WITHDRAW_REVERSE */
    @Column(nullable = false, length = 20)
    private String type;

    /** CASH | BONUS */
    @Column(nullable = false, length = 10)
    private String bucket;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "cash_after", nullable = false, precision = 14, scale = 2)
    private BigDecimal cashAfter;

    @Column(name = "bonus_after", nullable = false, precision = 14, scale = 2)
    private BigDecimal bonusAfter;

    @Column(name = "payment_transaction_id", columnDefinition = "CHAR(36)")
    private String paymentTransactionId;

    @Column(name = "order_id", columnDefinition = "CHAR(36)")
    private String orderId;

    @Column(name = "escrow_id", columnDefinition = "CHAR(36)")
    private String escrowId;

    @Column(name = "withdrawal_id", columnDefinition = "CHAR(36)")
    private String withdrawalId;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
