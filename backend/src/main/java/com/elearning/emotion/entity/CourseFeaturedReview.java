package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "course_featured_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uk_course_featured_reviews", columnNames = {"course_id", "review_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseFeaturedReview {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private CourseReview review;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "featured_by", nullable = false)
    private User featuredBy;

    @Column(name = "featured_at", nullable = false, updatable = false)
    private LocalDateTime featuredAt;

    @PrePersist
    public void prePersist() {
        if (featuredAt == null) {
            featuredAt = LocalDateTime.now();
        }
        if (sortOrder == null) {
            sortOrder = 0;
        }
    }
}
