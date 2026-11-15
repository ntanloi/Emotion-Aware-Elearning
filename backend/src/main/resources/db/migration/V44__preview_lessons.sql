-- V44: Che do hoc thu mien phi (preview lessons) cho video bai giang
ALTER TABLE content_items ADD COLUMN is_preview BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE content_items ADD COLUMN preview_duration_seconds INT NULL;
