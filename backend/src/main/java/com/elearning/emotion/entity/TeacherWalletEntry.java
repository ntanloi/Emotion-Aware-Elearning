package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_wallet_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherWalletEntry {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_request_id")
    private PayoutRequest payoutRequest;

    /** SALE | REFUND (Lịch sử) | PAYOUT */
    @Column(nullable = false, length = 30)
    private String type;

    /** Số tiền: Dương cho SALE, Âm cho REFUND và PAYOUT */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** Thời điểm tiền chính thức sẵn sàng để rút (từ nay luôn bằng thời điểm ghi nhận created_at, không giữ tiền) */
    @Column(name = "available_at", nullable = false)
    private LocalDateTime availableAt;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
