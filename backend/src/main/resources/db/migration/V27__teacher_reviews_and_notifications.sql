-- Phase 2: Teacher reply on course reviews and in-app notifications system

-- 1. Bổ sung trường phản hồi của giảng viên trên bảng course_reviews
ALTER TABLE course_reviews
    ADD COLUMN teacher_reply TEXT NULL,
    ADD COLUMN teacher_replied_at DATETIME NULL;

-- 2. Bảng thông báo người dùng (notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    reference_id VARCHAR(100) NULL,
    link VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_course_reviews_teacher_replied ON course_reviews(course_id, teacher_replied_at);
