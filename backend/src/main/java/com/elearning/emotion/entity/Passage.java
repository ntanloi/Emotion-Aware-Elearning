package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/** Doan van/hoi thoai dung chung cho nhieu cau hoi - Part 3/4 (audio) va Part 6/7 (van ban) */
@Entity
@Table(name = "passages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Passage {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_item_id", nullable = false)
    private ContentItem contentItem;

    /** Van ban doc (Part 6/7) hoac transcript (Part 3/4) */
    @Column(name = "passage_html", columnDefinition = "LONGTEXT")
    private String passageHtml;

    /** Part 3/4 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_media_id")
    private MediaAsset audio;

    /** Part 7: anh email/bieu mau kem theo */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_media_id")
    private MediaAsset image;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
}
