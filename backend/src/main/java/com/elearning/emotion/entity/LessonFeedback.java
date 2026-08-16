package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "lesson_feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LessonFeedback {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "weak_time_segment", length = 100)
    private String weakTimeSegment;

    @Column(name = "improvement_suggestion", columnDefinition = "TEXT")
    private String improvementSuggestion;

    @Column(name = "avg_focus_score")
    private Float avgFocusScore;
}
