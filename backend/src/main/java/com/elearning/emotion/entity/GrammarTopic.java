package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "grammar_topics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrammarTopic {

    @Id
    @Column(length = 40)
    private String code;

    @Column(name = "title_vi", nullable = false, length = 120)
    private String titleVi;

    @Column(name = "description_vi", columnDefinition = "TEXT")
    private String descriptionVi;

    @Column(name = "keywords_en", columnDefinition = "JSON")
    private String keywordsEn;

    @Column(name = "keywords_vi", columnDefinition = "JSON")
    private String keywordsVi;

    @Column(name = "good_example", length = 300)
    private String goodExample;

    @Column(name = "bad_example", length = 300)
    private String badExample;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean reviewed = false;
}
