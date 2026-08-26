package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tick hoàn thành của 1 học viên cho 1 content_item, TÁCH THEO practice_type.
 *
 * Lý do tách theo practice_type: 1 content_item type=VOCAB_SET tự sinh 5 dạng
 * luyện tập ảo (BR-18: FLASHCARD / MULTIPLE_CHOICE / MATCHING / LISTENING /
 * FILL_BLANK), mỗi dạng có Attempt và tick hoàn thành riêng trên UI (VD "List
 * 1/2" trên Study4 có nhiều dấu tick xanh/xám độc lập, không phải 1 tick
 * chung cho cả Bộ từ vựng).
 *
 * Với content_item KHÔNG phải VOCAB_SET (VIDEO_LECTURE, GRAMMAR_ARTICLE,
 * PRACTICE_TEST, DICTATION_SET), chỉ dùng đúng 1 dòng với
 * practice_type = DEFAULT.
 */
@Entity
@Table(name = "content_item_progress")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContentItemProgress {
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

    /** DEFAULT | FLASHCARD | MULTIPLE_CHOICE | MATCHING | LISTENING | FILL_BLANK */
    @Column(name = "practice_type", nullable = false, length = 30)
    @Builder.Default
    private String practiceType = "DEFAULT";

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "best_score", precision = 5, scale = 2)
    private BigDecimal bestScore;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
