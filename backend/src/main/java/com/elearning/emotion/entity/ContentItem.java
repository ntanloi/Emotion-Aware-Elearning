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

    /** Thời gian giới hạn làm bài (phút). Dùng cho PRACTICE_TEST/DICTATION_SET, NULL = không giới hạn */
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

    public boolean isVideoLecture() {
        return "VIDEO_LECTURE".equals(type);
    }
}