package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/**
 * ContentGroup — cap "Nhom hoat dong" (vd "List 1", "Danh tu") nam TRUC TIEP trong 1 muc
 * sidebar (course + sectionCode), chua nhieu ContentItem con (video bai giang, luyen tap...).
 * Truoc day nam giua Unit va ContentItem, nhung Unit la 1 tang du thua (moi muc sidebar
 * chi can danh sach Nhom, khong can dat ten rieng cho tang trung gian) nen da bi go bo.
 */
@Entity
@Table(name = "content_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContentGroup {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    /** VOCAB | GRAMMAR | PART1..PART7 | DICTATION | CUSTOM_{uuid} */
    @Column(name = "section_code", nullable = false, length = 20)
    private String sectionCode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
}
