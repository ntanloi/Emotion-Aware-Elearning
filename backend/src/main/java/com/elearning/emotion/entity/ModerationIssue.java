package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "moderation_issues")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationIssue {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private ModerationRun run;

    @Column(name = "issue_key", nullable = false, columnDefinition = "CHAR(64)")
    private String issueKey;

    @Column(name = "rule_id", nullable = false, length = 20)
    private String ruleId;

    /** STRUCTURE | CONTENT | LANGUAGE | SAFETY | SECURITY | COPYRIGHT | SYSTEM */
    @Column(nullable = false, length = 20)
    private String category;

    /** BLOCKER | ERROR | WARNING | INFO | CONTEXT */
    @Column(nullable = false, length = 8)
    private String severity;

    /** RULE | TOOL | LLM */
    @Column(nullable = false, length = 5)
    private String source;

    /** COURSE | SECTION | GROUP | ITEM | QUESTION | PASSAGE | VOCAB_WORD | MEDIA */
    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", columnDefinition = "CHAR(36)")
    private String targetId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 500)
    private String suggestion;

    @Column(length = 500)
    private String evidence;

    @Column
    private Float confidence;

    @Column(length = 60)
    private String model;

    @Column(name = "prompt_version", length = 20)
    private String promptVersion;
}
