package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

/** Đánh giá khóa học (sao + bình luận) của học viên đã đăng ký. Mỗi (course, user) chỉ có 1 review. */
@Entity
@Table(name = "course_reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseReview {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 1..5 sao */
    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    /** PUBLISHED | FLAGGED | HIDDEN | DELETED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PUBLISHED";

    /** Tiến độ % tại thời điểm đánh giá */
    @Column(name = "progress_at_review")
    private Integer progressAtReview;

    @Column(name = "is_edited", nullable = false)
    @Builder.Default
    private Boolean isEdited = false;

    /** Học viên đồng ý cho giảng viên giới thiệu đánh giá lên trang chủ khóa học */
    @Column(name = "allow_feature", nullable = false)
    @Builder.Default
    private Boolean allowFeature = false;

    /** Phản hồi công khai của giảng viên (Phase 2) */
    @Column(name = "teacher_reply", columnDefinition = "TEXT")
    private String teacherReply;

    @Column(name = "teacher_replied_at")
    private LocalDateTime teacherRepliedAt;

    /** Thông tin kiểm duyệt ẩn đánh giá (Phase 3) */
    @Column(name = "hidden_reason", length = 500)
    private String hiddenReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hidden_by")
    private User hiddenBy;

    @Column(name = "hidden_at")
    private LocalDateTime hiddenAt;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private java.util.List<ReviewImage> images = new java.util.ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
