package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/** 1 dong = 1 cap thuoc ve 1 "cau hoi ghep cap" (question.questionKind = MATCHING) */
@Entity
@Table(name = "matching_pairs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchingPair {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "left_content", nullable = false, length = 255)
    private String leftContent;

    @Column(name = "right_content", nullable = false, length = 255)
    private String rightContent;
}
