package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "content_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContentItem {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    /** VOCAB | GRAMMAR | PART1..PART7 | DICTATION | CUSTOM_{uuid} - muc sidebar chua hoat dong nay */
    @Column(name = "section_code", nullable = false, length = 20)
    private String sectionCode;

    /** NULLABLE - hoat dong khong bat buoc phai thuoc 1 nhom (xem ContentGroup / V4 migration) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private ContentGroup group;

    /** VIDEO_LECTURE | VOCAB_SET | GRAMMAR_ARTICLE | PRACTICE_TEST | DICTATION_SET */
    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    /** Thoi gian gioi han lam bai (phut). Dung cho PRACTICE_TEST/DICTATION_SET, NULL = khong gioi han */
    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    /** Chi dung khi type = VIDEO_LECTURE - noi duy nhat AI cam xuc duoc gan vao (xem LearningSession) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_media_id")
    private MediaAsset videoMedia;

    /** Noi dung ly thuyet (rich text). Dung cho GRAMMAR_ARTICLE (noi dung chinh) va VIDEO_LECTURE
     * (ly thuyet di kem video, tuy chon) */
    @Column(name = "body_html", columnDefinition = "LONGTEXT")
    private String bodyHtml;

    /** Chu diem ngu phap (chi dung khi type = GRAMMAR_ARTICLE) */
    @Column(name = "topic_code", length = 40)
    private String topicCode;

    /** Cho phep hoc vien hoc thu / xem truoc mien phi */
    @Column(name = "is_preview", nullable = false)
    @Builder.Default
    private Boolean isPreview = false;

    /** Thoi luong gioi han xem thu (giay). NULL hoac <= 0 nghia la xem tron ven toan bo video */
    @Column(name = "preview_duration_seconds")
    private Integer previewDurationSeconds;

    public boolean isVideoLecture() {
        return "VIDEO_LECTURE".equals(type);
    }
    public MediaAsset getVideo() {
        return this.videoMedia;
    }

    public void setVideo(MediaAsset video) {
        this.videoMedia = video;
    }

    public static class ContentItemBuilder {
        public ContentItemBuilder video(MediaAsset video) {
            return videoMedia(video);
        }
    }
}
