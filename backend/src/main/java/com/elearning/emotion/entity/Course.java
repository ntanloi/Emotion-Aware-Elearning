package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Course {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String level;

    @Column(name = "duration_hours")
    private Integer durationHours;

    @Column(name = "access_months", nullable = false)
    @Builder.Default
    private Integer accessMonths = 6;

    /** Giá đang bán. NULL = khoá học miễn phí */
    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    /** Giá gốc (gạch ngang) để tính % giảm giá trên card khoá học. NULL/= price ⇒ không hiện badge giảm giá */
    @Column(name = "original_price", precision = 12, scale = 2)
    private BigDecimal originalPrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_media_id")
    private MediaAsset coverMedia;

    /** DRAFT | PENDING_REVIEW | REJECTED | PUBLISHED | HIDDEN | SUSPENDED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    /** FULL | LISTENING | READING | TOPIC */
    @Column(nullable = false, length = 12)
    @Builder.Default
    private String profile = "TOPIC";

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "content_changed_at")
    private LocalDateTime contentChangedAt;

    @Column(name = "ai_moderation_report", columnDefinition = "JSON")
    private String aiModerationReport;

    /** Thống kê đánh giá khóa học (Phase 0) */
    @Column(name = "avg_rating", nullable = false)
    @Builder.Default
    private Double avgRating = 0.0;

    @Column(name = "review_count", nullable = false)
    @Builder.Default
    private Integer reviewCount = 0;

    @Column(name = "rating_1", nullable = false)
    @Builder.Default
    private Integer rating1 = 0;

    @Column(name = "rating_2", nullable = false)
    @Builder.Default
    private Integer rating2 = 0;

    @Column(name = "rating_3", nullable = false)
    @Builder.Default
    private Integer rating3 = 0;

    @Column(name = "rating_4", nullable = false)
    @Builder.Default
    private Integer rating4 = 0;

    @Column(name = "rating_5", nullable = false)
    @Builder.Default
    private Integer rating5 = 0;

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
