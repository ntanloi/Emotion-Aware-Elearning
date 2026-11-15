package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(
    name = "moderation_lexicon",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_lex", columnNames = {"category", "match_type", "pattern"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationLexicon {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    /** PROFANITY_VI | SCAM_AD | SCORE_GUARANTEE | PLACEHOLDER | HATE | etc. */
    @Column(nullable = false, length = 30)
    private String category;

    /** WORD | PHRASE | REGEX */
    @Column(name = "match_type", nullable = false, length = 8)
    private String matchType;

    @Column(nullable = false, length = 200)
    private String pattern;

    /** ERROR | WARNING | INFO | CONTEXT */
    @Column(nullable = false, length = 8)
    private String severity;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String lang = "vi";

    /** ALL | TITLE_DESC | BODY | QUESTION */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String scope = "ALL";

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(length = 255)
    private String note;
}
