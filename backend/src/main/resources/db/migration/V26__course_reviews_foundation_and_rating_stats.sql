-- =========================================================================
-- V26: Course Reviews Foundation, Review Images & Course Rating Stats (Phase 0)
-- =========================================================================

-- 1. Bổ sung các trường cốt lõi vào bảng course_reviews
ALTER TABLE course_reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE course_reviews ADD COLUMN progress_at_review INT NULL;
ALTER TABLE course_reviews ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE course_reviews ADD COLUMN allow_feature BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_course_reviews_status ON course_reviews(status);
CREATE INDEX idx_course_reviews_course_status ON course_reviews(course_id, status);

-- 2. Tạo bảng review_images để lưu tối đa 3 ảnh minh chứng cho đánh giá
CREATE TABLE IF NOT EXISTS review_images (
    id CHAR(36) PRIMARY KEY,
    review_id CHAR(36) NOT NULL,
    media_asset_id CHAR(36) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id) REFERENCES course_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_images_media FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_images_review ON review_images(review_id);
CREATE INDEX idx_review_images_media ON review_images(media_asset_id);

-- 3. Bổ sung các trường thống kê đánh giá trực tiếp vào bảng courses (chống N+1 query)
ALTER TABLE courses ADD COLUMN avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE courses ADD COLUMN review_count INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN rating_1 INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN rating_2 INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN rating_3 INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN rating_4 INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN rating_5 INT NOT NULL DEFAULT 0;

-- 4. Backfill dữ liệu đánh giá hiện có vào courses
UPDATE courses c
SET
    review_count = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED'), 0),
    avg_rating = COALESCE((SELECT ROUND(AVG(cr.rating), 1) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED'), 0.0),
    rating_1 = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED' AND cr.rating = 1), 0),
    rating_2 = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED' AND cr.rating = 2), 0),
    rating_3 = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED' AND cr.rating = 3), 0),
    rating_4 = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED' AND cr.rating = 4), 0),
    rating_5 = COALESCE((SELECT COUNT(*) FROM course_reviews cr WHERE cr.course_id = c.id AND cr.status = 'PUBLISHED' AND cr.rating = 5), 0);