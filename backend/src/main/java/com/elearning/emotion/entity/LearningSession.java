package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LearningSession {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    /** WAITING | LEARNING | PAUSED | FINISHED | ABANDONED (xem 2.2 trong dac ta) */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "WAITING";

    @Column(name = "has_camera_permission", nullable = false)
    @Builder.Default
    private Boolean hasCameraPermission = false;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    /** BR-05: % thoi luong o nhom cam xuc tich cuc/trung tinh */
    @Column(name = "focus_score")
    private Float focusScore;

    @PrePersist
    void onCreate() { if (startTime == null) startTime = LocalDateTime.now(); }
}
