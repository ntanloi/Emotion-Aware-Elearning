package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

/** Nguon du lieu cho trang "On tap Flashcards" tong hop - gom tu vung tu MOI unit/khoa hoc da hoc */
@Entity
@Table(name = "flashcard_progress")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FlashcardProgress {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private VocabWord word;

    /** NEW | LEARNING | MASTERED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "NEW";

    @Column(name = "last_reviewed_at")
    private LocalDateTime lastReviewedAt;

    @Column(name = "next_review_at")
    private LocalDateTime nextReviewAt;
}
