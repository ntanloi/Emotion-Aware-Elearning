package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

/** Cau hoi dung chung cho moi dang bai: Part 1-7, ngu phap, chinh ta. */
@Entity
@Table(name = "questions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Question {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    /** NULL neu cau hoi doc lap (Part 1,2,5; ngu phap; chinh ta) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passage_id")
    private Passage passage;

    /** MULTIPLE_CHOICE | FILL_BLANK | MATCHING | DICTATION */
    @Column(name = "question_kind", nullable = false, length = 20)
    private String questionKind;

    @Column(name = "prompt_text", columnDefinition = "TEXT")
    private String promptText;

    /** Part 1: anh mo ta */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_media_id")
    private MediaAsset image;

    /** Part 1,2 hoac cau hoi co nghe */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_media_id")
    private MediaAsset audio;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    /**
     * Chi dung cho cau hoi DICTATION duoc TU SINH tu thu vien tu vung (Giai doan 3c).
     * NULL neu cau hoi do giao vien tu nhap tay (Part 1-7/ngu phap) hoac chinh ta tao truoc
     * khi co tinh nang tu sinh. Xem DictationGeneratorService.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_vocab_word_id")
    private VocabWord sourceVocabWord;

    /**
     * Giai thich dap an (tuy chon). Giao vien co the them giai thich de giup hoc vien hieu ro hon
     * tai sao dap an la dung. Hien thi thong qua nut dropdown "Giai thich" sau khi kiem tra dap an.
     */
    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
