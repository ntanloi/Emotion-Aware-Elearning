package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "adaptive_suggestions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdaptiveSuggestion {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private LearningSession session;

    @Column(name = "trigger_type", nullable = false, length = 50)
    private String triggerType;

    @Column(name = "video_segment_start", nullable = false)
    private Integer videoSegmentStart;

    @Column(name = "video_segment_end", nullable = false)
    private Integer videoSegmentEnd;

    @Column(name = "triggered_at", nullable = false)
    private LocalDateTime triggeredAt;

    @Column(name = "was_accepted")
    private Boolean wasAccepted;

    @PrePersist
    void onCreate() { if (triggeredAt == null) triggeredAt = LocalDateTime.now(); }
}
