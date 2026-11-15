-- Phase 3: Review moderation, reports and keyword filtering

-- 1. Bổ sung trường ẩn đánh giá trên bảng course_reviews
ALTER TABLE course_reviews
    ADD COLUMN hidden_reason VARCHAR(500) NULL,
    ADD COLUMN hidden_by CHAR(36) NULL,
    ADD COLUMN hidden_at DATETIME NULL;

-- 2. Bổ sung trường ẩn riêng ảnh trên bảng review_images
ALTER TABLE review_images
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN hidden_reason VARCHAR(255) NULL;

-- 3. Bảng báo cáo đánh giá và ảnh vi phạm (review_reports)
CREATE TABLE IF NOT EXISTS review_reports (
    id CHAR(36) NOT NULL PRIMARY KEY,
    review_id CHAR(36) NOT NULL,
    image_id CHAR(36) NULL,
    reporter_id CHAR(36) NOT NULL,
    reason VARCHAR(100) NOT NULL, -- SPAM | INAPPROPRIATE | PHONE_NUMBER | SENSITIVE_INFO | OTHER
    details TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING | RESOLVED_HIDDEN | RESOLVED_DISMISSED
    resolved_by CHAR(36) NULL,
    resolved_at DATETIME NULL,
    resolution_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_reports_review FOREIGN KEY (review_id) REFERENCES course_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reports_image FOREIGN KEY (image_id) REFERENCES review_images(id) ON DELETE SET NULL,
    CONSTRAINT fk_review_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reports_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_review_reports_status ON review_reports(status, created_at DESC);
CREATE INDEX idx_review_reports_review ON review_reports(review_id);
