package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_reports", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "report_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyReport {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    /** CHUA_TAO | DA_TAO | DA_XEM */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "CHUA_TAO";

    @Column(name = "emotion_summary", columnDefinition = "TEXT")
    private String emotionSummary;

    @Column(name = "ai_advice_text", columnDefinition = "TEXT")
    private String aiAdviceText;

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
