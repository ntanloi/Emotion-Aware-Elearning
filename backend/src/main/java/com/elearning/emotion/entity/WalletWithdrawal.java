package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_withdrawals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletWithdrawal {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "from_cash", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal fromCash = BigDecimal.ZERO;

    @Column(name = "from_bonus", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal fromBonus = BigDecimal.ZERO;

    @Column(name = "bank_id", nullable = false, length = 50)
    private String bankId;

    @Column(name = "bank_account_no", nullable = false, length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name", nullable = false, length = 150)
    private String bankAccountName;

    /** PENDING | PAID | REJECTED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "processed_by", columnDefinition = "CHAR(36)")
    private String processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (fromCash == null) fromCash = BigDecimal.ZERO;
        if (fromBonus == null) fromBonus = BigDecimal.ZERO;
    }
}
