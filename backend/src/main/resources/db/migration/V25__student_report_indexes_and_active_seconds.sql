-- V25: Chỉ mục và các cột bổ trợ cho trang Báo cáo học viên & Chuẩn hóa dữ liệu buổi học
CREATE INDEX idx_sbs_user_item ON session_bucket_stats (user_id, content_item_id);
CREATE INDEX idx_sessions_user_start ON learning_sessions (user_id, start_time);

ALTER TABLE learning_sessions ADD COLUMN active_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE learning_sessions ADD COLUMN last_active_at DATETIME NULL;

-- Cập nhật dữ liệu quá khứ cho các phiên đã kết thúc (nếu active_seconds đang là 0)
UPDATE learning_sessions
SET active_seconds = TIMESTAMPDIFF(SECOND, start_time, COALESCE(end_time, start_time))
WHERE active_seconds = 0 AND end_time IS NOT NULL;

ALTER TABLE daily_reports
    ADD COLUMN metrics JSON NULL;