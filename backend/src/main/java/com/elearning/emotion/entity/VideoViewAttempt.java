package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "video_view_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoViewAttempt {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "content_item_id", columnDefinition = "CHAR(36)", nullable = false)
    private String contentItemId;

    /** OPEN | VALID | INVALID | EXPIRED */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "duration_sec", nullable = false)
    @Builder.Default
    private Integer durationSec = 0;

    @Column(name = "bin_sec", nullable = false)
    @Builder.Default
    private Integer binSec = 10;

    @Column(name = "covered_bins", nullable = false, columnDefinition = "VARBINARY(1024)")
    private byte[] coveredBins;

    @Column(name = "samples_total", nullable = false)
    @Builder.Default
    private Integer samplesTotal = 0;

    @Column(name = "samples_noface", nullable = false)
    @Builder.Default
    private Integer samplesNoface = 0;

    @Column(name = "samples_bored", nullable = false)
    @Builder.Default
    private Integer samplesBored = 0;

    @Column(name = "bored_run_frames", nullable = false)
    @Builder.Default
    private Integer boredRunFrames = 0;

    @Column(name = "bored_gap_frames", nullable = false)
    @Builder.Default
    private Integer boredGapFrames = 0;

    @Column(name = "bored_idle_frames", nullable = false)
    @Builder.Default
    private Integer boredIdleFrames = 0;

    @Column(name = "bored_run_flagged", nullable = false)
    @Builder.Default
    private boolean boredRunFlagged = false;

    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastActivityAt == null) {
            lastActivityAt = LocalDateTime.now();
        }
        if (durationSec == null) durationSec = 0;
        if (binSec == null) binSec = 10;
        if (coveredBins == null) coveredBins = new byte[0];
        if (samplesTotal == null) samplesTotal = 0;
        if (samplesNoface == null) samplesNoface = 0;
        if (samplesBored == null) samplesBored = 0;
        if (boredRunFrames == null) boredRunFrames = 0;
        if (boredGapFrames == null) boredGapFrames = 0;
        if (boredIdleFrames == null) boredIdleFrames = 0;
    }
}
