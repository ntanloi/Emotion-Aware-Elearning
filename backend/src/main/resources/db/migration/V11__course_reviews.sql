-- V11: Đánh giá khóa học (rating 1-5 sao + bình luận).
-- Ai cũng xem được review + số sao (kể cả chưa đăng nhập / chưa đăng ký).
-- Chỉ học viên ĐÃ ĐĂNG KÝ (có bản ghi trong enrollments) mới được viết đánh giá.
-- Mỗi học viên chỉ đánh giá 1 lần / khóa học (được sửa/xóa đánh giá của chính mình).
CREATE TABLE course_reviews (
    id          CHAR(36)  PRIMARY KEY,
    course_id   CHAR(36)  NOT NULL,
    user_id     CHAR(36)  NOT NULL,
    rating      TINYINT   NOT NULL,
    comment     TEXT      NULL,
    created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME  NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_course FOREIGN KEY (course_id) REFERENCES courses(id),
    CONSTRAINT fk_review_user   FOREIGN KEY (user_id)   REFERENCES users(id),
    CONSTRAINT uq_review_course_user UNIQUE (course_id, user_id),
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_review_course ON course_reviews (course_id);
