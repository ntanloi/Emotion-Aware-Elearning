package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentWallet {

    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "cash_balance", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal cashBalance = BigDecimal.ZERO;

    @Column(name = "bonus_balance", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal bonusBalance = BigDecimal.ZERO;

    @Column(name = "topup_code", nullable = false, length = 11, unique = true)
    private String topupCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
        if (cashBalance == null) cashBalance = BigDecimal.ZERO;
        if (bonusBalance == null) bonusBalance = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
