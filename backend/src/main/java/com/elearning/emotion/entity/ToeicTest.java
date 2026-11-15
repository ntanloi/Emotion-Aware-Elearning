package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "toeic_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToeicTest {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    /** COURSE | SYSTEM | COMMUNITY */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String source = "COURSE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | HIDDEN */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origin_test_id")
    private ToeicTest originTest;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "listening_minutes", nullable = false)
    @Builder.Default
    private Integer listeningMinutes = 45;

    @Column(name = "reading_minutes", nullable = false)
    @Builder.Default
    private Integer readingMinutes = 75;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private Integer attemptCount = 0;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ToeicTestPart> parts = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (version == null) version = 1;
        if (source == null) source = "COURSE";
        if (status == null) status = "DRAFT";
        if (listeningMinutes == null) listeningMinutes = 45;
        if (readingMinutes == null) readingMinutes = 75;
        if (attemptCount == null) attemptCount = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
