package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "vocab_words")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VocabWord {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    /** Thu vien tu vung rieng cua tung giang vien, dung lai duoc giua nhieu unit/khoa hoc */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(nullable = false, length = 150)
    private String word;

    @Column(length = 100)
    private String ipa;

    @Column(name = "part_of_speech", length = 30)
    private String partOfSpeech;

    @Column(name = "meaning_vi", nullable = false, columnDefinition = "TEXT")
    private String meaningVi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_media_id")
    private MediaAsset image;

    /** Audio phát âm giọng Anh-Anh (UK) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_uk_media_id")
    private MediaAsset audioUk;

    /** Audio phát âm giọng Anh-Mỹ (US) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_us_media_id")
    private MediaAsset audioUs;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
