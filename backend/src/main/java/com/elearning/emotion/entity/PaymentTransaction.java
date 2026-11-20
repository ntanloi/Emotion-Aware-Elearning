package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "sepay_id", nullable = true, unique = true)
    private Long sepayId;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String gateway = "SePay";

    /** ORDER | TOPUP */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String kind = "ORDER";

    @Column(name = "topup_user_id", columnDefinition = "CHAR(36)")
    private String topupUserId;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "sub_account", length = 50)
    private String subAccount;

    @Column(name = "transfer_type", length = 20)
    private String transferType;

    @Column(name = "transfer_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal transferAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal accumulated;

    @Column(length = 100)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** MATCHED | UNMATCHED | AMOUNT_MISMATCH */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "UNMATCHED";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_request_id")
    private PayoutRequest payoutRequest;

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
