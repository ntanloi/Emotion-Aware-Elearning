-- V24: Bảng tổng hợp số liệu cảm xúc theo phiên và bucket 10 giây (Tối ưu hóa báo cáo giảng viên KLTN)
CREATE TABLE session_bucket_stats (
    session_id      CHAR(36) NOT NULL,
    bucket_index    INT      NOT NULL,            -- floor(video_time_sec / 10)
    content_item_id CHAR(36) NOT NULL,
    user_id         CHAR(36) NOT NULL,
    n_total         INT      NOT NULL DEFAULT 0,
    n_engaged       INT      NOT NULL DEFAULT 0,
    n_interested    INT      NOT NULL DEFAULT 0,
    n_neutral       INT      NOT NULL DEFAULT 0,
    n_confused      INT      NOT NULL DEFAULT 0,
    n_bored         INT      NOT NULL DEFAULT 0,
    n_noface        INT      NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, bucket_index),
    KEY idx_sbs_item_bucket (content_item_id, bucket_index)
);

CREATE INDEX idx_emotion_captured ON emotion_logs (captured_at);

-- Dồn dữ liệu cũ từ emotion_logs sang session_bucket_stats nếu đã có dữ liệu trước đó
INSERT INTO session_bucket_stats (
    session_id, bucket_index, content_item_id, user_id,
    n_total, n_engaged, n_interested, n_neutral, n_confused, n_bored, n_noface
)
SELECT l.session_id,
       FLOOR(l.video_time_sec / 10),
       s.content_item_id,
       s.user_id,
       COUNT(*),
       SUM(CASE WHEN l.learning_state = 'ENGAGED' THEN 1 ELSE 0 END),
       SUM(CASE WHEN l.learning_state = 'INTERESTED' THEN 1 ELSE 0 END),
       SUM(CASE WHEN l.learning_state = 'NEUTRAL' THEN 1 ELSE 0 END),
       SUM(CASE WHEN l.learning_state = 'CONFUSED' THEN 1 ELSE 0 END),
       SUM(CASE WHEN l.learning_state = 'BORED' THEN 1 ELSE 0 END),
       SUM(CASE WHEN l.learning_state = 'NO_FACE' THEN 1 ELSE 0 END)
FROM emotion_logs l
JOIN learning_sessions s ON s.id = l.session_id
WHERE l.video_time_sec IS NOT NULL
GROUP BY l.session_id, FLOOR(l.video_time_sec / 10), s.content_item_id, s.user_id
ON DUPLICATE KEY UPDATE n_total = VALUES(n_total);
