package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonAlert {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    @Column(name = "start_sec", nullable = false)
    private Integer startSec;

    @Column(name = "end_sec", nullable = false)
    private Integer endSec;

    @Column(name = "negative_ratio", precision = 5, scale = 4, nullable = false)
    private BigDecimal negativeRatio;

    @Column(name = "n_students", nullable = false)
    private Integer nStudents;

    /** CONFUSED | BORED */
    @Column(name = "dominant_state", length = 20)
    private String dominantState;

    @Column(name = "affected_students", nullable = false)
    @Builder.Default
    private Integer affectedStudents = 0;

    @Column(name = "recurring_students", nullable = false)
    @Builder.Default
    private Integer recurringStudents = 0;

    @Column(name = "sustained_students", nullable = false)
    @Builder.Default
    private Integer sustainedStudents = 0;

    /** HIGH | MEDIUM | LOW */
    @Column(name = "severity", length = 10)
    private String severity;

    @Column(name = "raw_start_sec")
    private Integer rawStartSec;

    /** OPEN | ACKED | RESOLVED */
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (status == null) status = "OPEN";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
