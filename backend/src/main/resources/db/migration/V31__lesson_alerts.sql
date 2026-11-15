-- V31: He thong canh bao diem nghen bai giang (Segment Alerts) dua tren cam xuc hoc vien (KLTN Phase H2)
CREATE TABLE lesson_alerts (
    id              CHAR(36) PRIMARY KEY,
    content_item_id CHAR(36) NOT NULL,
    start_sec       INT NOT NULL,
    end_sec         INT NOT NULL,
    negative_ratio  DECIMAL(5, 4) NOT NULL,
    n_students      INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | ACKED | RESOLVED
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_la_content_item FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
    UNIQUE KEY uq_item_start (content_item_id, start_sec),
    INDEX idx_la_item (content_item_id),
    INDEX idx_la_status (status),
    INDEX idx_la_created_at (created_at)
);
