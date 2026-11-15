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

    /** Transcript hoi thoai/bai noi (Part 3/4, di kem audio) */
    @Column(name = "transcript_html", columnDefinition = "LONGTEXT")
    private String transcriptHtml;

    /** Van ban doc (Part 6/7) */
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

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Transient
    private String title;

    public String getTranscript() {
        return transcriptHtml != null ? transcriptHtml : passageHtml;
    }

    public void setTranscript(String transcript) {
        this.transcriptHtml = transcript;
    }

    public String getContent() {
        return passageHtml != null ? passageHtml : transcriptHtml;
    }

    public void setContent(String content) {
        this.passageHtml = content;
    }

    public static class PassageBuilder {
        public PassageBuilder transcript(String transcript) {
            return transcriptHtml(transcript);
        }

        public PassageBuilder content(String content) {
            return passageHtml(content);
        }

        public PassageBuilder title(String title) {
            this.title = title;
            return this;
        }
    }
}
