package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "moderation_issue_decisions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_decision", columnNames = {"course_id", "issue_key"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationIssueDecision {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "issue_key", nullable = false, columnDefinition = "CHAR(64)")
    private String issueKey;

    @Column(name = "content_hash", nullable = false, columnDefinition = "CHAR(64)")
    private String contentHash;

    /** ACCEPT | DISMISS | NEED_FIX */
    @Column(nullable = false, length = 8)
    private String decision;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by", nullable = false)
    private User decidedBy;

    @Column(name = "decided_at", nullable = false)
    private LocalDateTime decidedAt;

    @PrePersist
    void onCreate() {
        if (decidedAt == null) decidedAt = LocalDateTime.now();
    }
}
