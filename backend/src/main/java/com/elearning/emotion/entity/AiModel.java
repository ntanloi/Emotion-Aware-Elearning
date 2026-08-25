package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

/**
 * Dang ky cac phien ban model nhan dien cam xuc (ke ca face-api.js cu va model tu train sau nay).
 * Xem docs/erd.md phan "Vi sao them AI_MODELS?".
 */
@Entity
@Table(name = "ai_models")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiModel {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String version;

    private String framework;

    @Column(name = "dataset_trained_on")
    private String datasetTrainedOn;

    @Column(name = "accuracy_test")
    private Float accuracyTest;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "deployed_at")
    private LocalDateTime deployedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

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
