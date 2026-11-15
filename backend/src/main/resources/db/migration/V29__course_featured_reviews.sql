-- Migration V29: Giới thiệu khóa học (Phase 4)
-- Bảng course_featured_reviews: Giảng viên ghim các đánh giá tiêu biểu có ảnh lên trang giới thiệu khóa học.
-- Điều kiện: Đánh giá PUBLISHED, học viên đã đồng ý (allow_feature = true), có ít nhất 1 ảnh không bị ẩn, từ 4 sao trở lên, tối đa 6 đánh giá mỗi khóa.

CREATE TABLE IF NOT EXISTS course_featured_reviews (
    id CHAR(36) NOT NULL,
    course_id CHAR(36) NOT NULL,
    review_id CHAR(36) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    featured_by CHAR(36) NOT NULL,
    featured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_course_featured_reviews PRIMARY KEY (id),
    CONSTRAINT fk_cfr_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cfr_review FOREIGN KEY (review_id) REFERENCES course_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_cfr_featured_by FOREIGN KEY (featured_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_course_featured_reviews UNIQUE (course_id, review_id)
);

CREATE INDEX idx_cfr_course_sort ON course_featured_reviews(course_id, sort_order ASC);
CREATE INDEX idx_cfr_review ON course_featured_reviews(review_id);
