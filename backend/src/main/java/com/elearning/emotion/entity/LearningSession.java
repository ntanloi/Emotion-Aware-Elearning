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

    /**
     * CHI duoc tro toi ContentItem co type = VIDEO_LECTURE (video bai giang ly thuyet).
     * Rang buoc nay khong ep duoc bang FK/DB (MySQL khong ho tro FK co dieu kien) nen
     * PHAI validate o LearningSessionService truoc khi tao session - xem startSession().
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    /** WAITING | LEARNING | PAUSED | FINISHED | ABANDONED (xem 2.2 trong dac ta) */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "WAITING";

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)")
    private String attemptId;

    @Column(name = "face_lost_since")
    private LocalDateTime faceLostSince;

    /** ON | OFF */
    @Column(name = "camera_choice", length = 3)
    private String cameraChoice;

    @Column(name = "has_camera_permission", nullable = false)
    @Builder.Default
    private Boolean hasCameraPermission = false;

    /** H5 Item 5: Ghi nhận sự đồng ý dùng camera */
    @Column(name = "consent_version", length = 20)
    private String consentVersion;

    @Column(name = "consent_at")
    private LocalDateTime consentAt;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    /** BR-05: % thoi luong o nhom cam xuc tich cuc/trung tinh */
    @Column(name = "focus_score")
    private Float focusScore;

    @Column(name = "active_seconds", nullable = false)
    @Builder.Default
    private Integer activeSeconds = 0;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    public LocalDateTime getEndedAt() { return endTime; }

    @PrePersist
    void onCreate() { if (startTime == null) startTime = LocalDateTime.now(); }
}
