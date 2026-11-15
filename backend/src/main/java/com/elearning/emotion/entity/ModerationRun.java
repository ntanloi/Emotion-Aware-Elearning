package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "moderation_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationRun {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "policy_version", nullable = false)
    private Integer policyVersion;

    @Column(name = "lexicon_version", length = 40)
    private String lexiconVersion;

    @Column(name = "content_hash", nullable = false, columnDefinition = "CHAR(64)")
    private String contentHash;

    /** SUBMITTED | ANALYZING | READY_FOR_REVIEW | DECIDED | FAILED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "risk_score", nullable = false)
    @Builder.Default
    private Integer riskScore = 0;

    /** LOW | MEDIUM | HIGH */
    @Column(name = "risk_level", length = 6)
    private String riskLevel;

    @Column(name = "readiness_snapshot", columnDefinition = "JSON")
    private String readinessSnapshot;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @PrePersist
    void onCreate() {
        if (submittedAt == null) submittedAt = LocalDateTime.now();
        if (status == null) status = "SUBMITTED";
        if (riskScore == null) riskScore = 0;
    }
}
