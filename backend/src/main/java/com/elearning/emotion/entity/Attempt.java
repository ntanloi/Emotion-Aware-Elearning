package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

/** 1 luot lam bai cua hoc vien voi 1 ContentItem co cau hoi (Part 1-7, ngu phap, chinh ta, trac nghiem tu vung...) */
@Entity
@Table(name = "attempts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Attempt {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    private Float score;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    @Column(name = "correct_count")
    private Integer correctCount;

    @PrePersist
    void onCreate() { if (startedAt == null) startedAt = LocalDateTime.now(); }
}
