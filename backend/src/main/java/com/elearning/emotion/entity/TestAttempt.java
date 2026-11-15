package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestAttempt {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    private ToeicTest test;

    /** FULL | PRACTICE */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String mode = "FULL";

    @Column(name = "selected_parts", length = 50)
    private String selectedParts;

    /** IMMEDIATE | AFTER_TEST */
    @Column(name = "feedback_mode", nullable = false, length = 20)
    @Builder.Default
    private String feedbackMode = "AFTER_TEST";

    @Column(name = "time_limit_seconds", nullable = false)
    @Builder.Default
    private Integer timeLimitSeconds = 7200;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "deadline_at")
    private LocalDateTime deadlineAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    /** IN_PROGRESS | COMPLETED | TIMED_OUT | ABANDONED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "IN_PROGRESS";

    @Column(name = "score_listening")
    private Integer scoreListening;

    @Column(name = "score_reading")
    private Integer scoreReading;

    @Column(name = "score_total")
    private Integer scoreTotal;

    @Column(name = "raw_listening_correct")
    private Integer rawListeningCorrect;

    @Column(name = "raw_reading_correct")
    private Integer rawReadingCorrect;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    @Column(name = "total_correct")
    private Integer totalCorrect;

    @Column(name = "draft_answers", columnDefinition = "LONGTEXT")
    private String draftAnswers;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "testAttempt")
    @Builder.Default
    private List<Attempt> partAttempts = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (startedAt == null) startedAt = LocalDateTime.now();
        if (mode == null) mode = "FULL";
        if (feedbackMode == null) feedbackMode = "AFTER_TEST";
        if (status == null) status = "IN_PROGRESS";
        if (timeLimitSeconds == null) timeLimitSeconds = 7200;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
