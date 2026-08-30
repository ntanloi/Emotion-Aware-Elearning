package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/**
 * Danh sach tu thuoc 1 ContentItem (type = VOCAB_SET).
 * He thong tu sinh cac dang bai luyen tap (flashcard/trac nghiem/ghep cap/nghe/dien tu)
 * TU CHINH danh sach nay o tang service - giang vien chi nhap 1 lan.
 */
@Entity
@Table(name = "vocab_set_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VocabSetItem {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private VocabWord word;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
}
