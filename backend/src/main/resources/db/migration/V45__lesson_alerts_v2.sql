-- V45: Nang cap he thong canh bao diem nghen bai giang (Segment Alerts V2)
-- Bo sung cac truong danh gia theo cap do hoc vien va tap episode cam xuc

ALTER TABLE lesson_alerts
  ADD COLUMN dominant_state     VARCHAR(20)  NULL,
  ADD COLUMN affected_students  INT          NOT NULL DEFAULT 0,
  ADD COLUMN recurring_students INT          NOT NULL DEFAULT 0,
  ADD COLUMN sustained_students INT          NOT NULL DEFAULT 0,
  ADD COLUMN severity           VARCHAR(10)  NULL,      -- HIGH | MEDIUM | LOW
  ADD COLUMN raw_start_sec      INT          NULL;

-- Bo khoa UNIQUE cu de ho tro mo rong/gop dai thoi gian canh bao ma khong bi xung dot
ALTER TABLE lesson_alerts DROP INDEX uq_item_start;
CREATE INDEX idx_la_item_time ON lesson_alerts (content_item_id, start_sec, end_sec);
