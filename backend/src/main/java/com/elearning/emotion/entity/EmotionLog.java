package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "emotion_logs", indexes = @Index(name = "idx_emotion_session", columnList = "session_id"))
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

    @Column(name = "confidence_score", nullable = false)
    private Float confidenceScore;

    /** Xac suat tren ca 7 nhan, vd {"happy":0.87,"neutral":0.05,...} - phuc vu danh gia mo hinh */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_scores", columnDefinition = "json")
    private Map<String, Float> rawScores;
}
