package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reward_escrows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardEscrow {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false, unique = true)
    private String orderId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "course_id", columnDefinition = "CHAR(36)", nullable = false)
    private String courseId;

    @Column(name = "teacher_id", columnDefinition = "CHAR(36)", nullable = false)
    private String teacherId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** HOLDING | CLAIMED | RELEASED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "HOLDING";

    @Column(name = "required_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal requiredPercent;

    @Column(name = "policy_version", nullable = false, length = 20)
    private String policyVersion;

    @Column(name = "holding_until", nullable = false)
    private LocalDateTime holdingUntil;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
