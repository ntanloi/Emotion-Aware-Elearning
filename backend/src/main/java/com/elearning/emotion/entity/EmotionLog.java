package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "emotion_logs", indexes = {
        @Index(name = "idx_emotion_session", columnList = "session_id"),
        @Index(name = "idx_emotion_learning_state", columnList = "session_id, learning_state")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmotionLog {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private LearningSession session;

    /** Model nao da sinh ra nhan nay. Nullable de tuong thich du lieu cu neu can. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    private AiModel model;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    /** neutral | happy | sad | angry | fearful | disgusted | surprised | no_face */
    @Column(name = "emotion_label", nullable = false, length = 20)
    private String emotionLabel;

    /** ENGAGED | INTERESTED | CONFUSED | BORED | NEUTRAL | NO_FACE */
    @Column(name = "learning_state", nullable = false, length = 20)
    @Builder.Default
    private String learningState = "ENGAGED";

    @Column(name = "confidence_score", nullable = false)
    private Float confidenceScore;

    @Column(name = "video_time_sec")
    private Float videoTimeSec;

    /** Xac suat tren ca 7 nhan luu dang JSON String (vd {"happy":0.87,"neutral":0.05,...}) */
    @Column(name = "raw_scores", columnDefinition = "JSON")
    private String rawScores;
}
