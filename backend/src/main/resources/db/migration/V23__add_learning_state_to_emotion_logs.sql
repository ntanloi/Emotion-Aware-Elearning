-- V23: Thêm cột learning_state và video_time_sec vào emotion_logs (Phase B2 KLTN)
-- learning_state: ENGAGED | INTERESTED | CONFUSED | BORED | NEUTRAL | NO_FACE
-- video_time_sec: Vị trí thời gian phát video (giây) tại thời điểm chụp khung hình

ALTER TABLE emotion_logs ADD COLUMN learning_state VARCHAR(20) NOT NULL DEFAULT 'ENGAGED' AFTER emotion_label;
ALTER TABLE emotion_logs ADD COLUMN video_time_sec FLOAT NULL AFTER confidence_score;

CREATE INDEX idx_emotion_learning_state ON emotion_logs (session_id, learning_state);