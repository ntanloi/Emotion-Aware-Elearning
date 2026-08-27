package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/**
 * Mục sidebar tùy chỉnh do giáo viên thêm vào (ngoài 10 mục cố định VOCAB/GRAMMAR/PART1-7/DICTATION).
 * sectionCode tương ứng = "CUSTOM_" + id, được backend tự sinh khi tạo.
 */
@Entity
@Table(name = "course_custom_sections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseCustomSection {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String icon = "📌";

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
}
