package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "vocab_examples")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VocabExample {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private VocabWord word;

    @Column(name = "sentence_en", nullable = false, columnDefinition = "TEXT")
    private String sentenceEn;

    @Column(name = "sentence_vi", nullable = false, columnDefinition = "TEXT")
    private String sentenceVi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_media_id")
    private MediaAsset audio;
}
