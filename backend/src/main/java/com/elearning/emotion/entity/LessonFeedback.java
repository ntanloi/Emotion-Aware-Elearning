package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/** BR-07: sinh khi 1 video bai giang (content_item type=VIDEO_LECTURE) du toi thieu 5 session hop le */
@Entity
@Table(name = "lesson_feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LessonFeedback {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    @Column(name = "weak_time_segment", length = 100)
    private String weakTimeSegment;

    @Column(name = "improvement_suggestion", columnDefinition = "TEXT")
    private String improvementSuggestion;

    @Column(name = "avg_focus_score")
    private Float avgFocusScore;
}
