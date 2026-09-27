-- ============================================================
-- V3: Vá 4 khoảng trống phát hiện khi đối chiếu 37 ảnh chụp màn hình
--     Study4 thực tế với schema V1+V2 hiện có.
--
-- Chỉ triển khai đúng 4 gap có bằng chứng ảnh cụ thể (theo yêu cầu người
-- dùng). Các gap khác (passages.translation_html, enrollments.target_score/
-- exam_date, users.is_locked, system_settings) CHƯA làm ở migration này.
-- ============================================================

-- ---------- 1. courses: giá + giá gạch + ảnh bìa ----------
-- Bằng chứng: card khoá học Study4 hiển thị giá đang bán + giá gốc gạch
-- ngang + % giảm (VD "1.050.000đ  1.800.000đ  -41%") và có ảnh bìa riêng.
-- original_price NULL/= price ⇒ không hiển thị giá gạch/badge giảm giá.
ALTER TABLE courses
    ADD COLUMN price           DECIMAL(12, 2) NULL AFTER duration_hours,
    ADD COLUMN original_price  DECIMAL(12, 2) NULL AFTER price,
    ADD COLUMN cover_media_id  CHAR(36)       NULL AFTER original_price,
    ADD CONSTRAINT fk_course_cover FOREIGN KEY (cover_media_id) REFERENCES media_assets (id);

-- ---------- 2. content_item_progress: tick hoàn thành theo TỪNG dạng luyện tập ----------
-- Bằng chứng: mỗi Bộ từ vựng (1 content_item type=VOCAB_SET) hiển thị NHIỀU
-- dấu tick độc lập (Flashcard / Trắc nghiệm / Ghép cặp / Nghe / Dịch nghĩa)
-- chứ không phải 1 tick chung cho cả content_item — vì hệ thống tự sinh 5
-- dạng luyện tập ảo từ CÙNG 1 Bộ từ vựng (BR-18), mỗi dạng có Attempt và
-- trạng thái hoàn thành riêng.
-- practice_type = 'DEFAULT' dùng cho các content_item KHÔNG phải VOCAB_SET
-- (VIDEO_LECTURE, GRAMMAR_ARTICLE, PRACTICE_TEST, DICTATION_SET) — chỉ có
-- đúng 1 dòng tiến độ mỗi học viên/hoạt động.
CREATE TABLE content_item_progress (
    id                CHAR(36) PRIMARY KEY,
    user_id           CHAR(36)     NOT NULL,
    content_item_id   CHAR(36)     NOT NULL,
    practice_type     VARCHAR(30)  NOT NULL DEFAULT 'DEFAULT',
        -- DEFAULT | FLASHCARD | MULTIPLE_CHOICE | MATCHING | LISTENING | FILL_BLANK
    is_completed      BOOLEAN      NOT NULL DEFAULT FALSE,
    best_score        DECIMAL(5, 2) NULL,
    completed_at      DATETIME     NULL,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cip_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_cip_item FOREIGN KEY (content_item_id) REFERENCES content_items (id),
    UNIQUE KEY uq_content_item_progress (user_id, content_item_id, practice_type)
);

-- ---------- 3. vocab_words: 2 audio phát âm UK/US riêng biệt ----------
-- Bằng chứng: mỗi từ vựng trong danh sách/flashcard có 2 icon loa riêng để
-- phát âm giọng Anh-Anh (UK) và Anh-Mỹ (US) — 1 audio_media_id dùng chung
-- không đủ.
ALTER TABLE vocab_words
    ADD COLUMN audio_uk_media_id CHAR(36) NULL AFTER image_media_id,
    ADD COLUMN audio_us_media_id CHAR(36) NULL AFTER audio_uk_media_id;

UPDATE vocab_words SET audio_uk_media_id = audio_media_id WHERE audio_media_id IS NOT NULL;

ALTER TABLE vocab_words
    ADD CONSTRAINT fk_word_audio_uk FOREIGN KEY (audio_uk_media_id) REFERENCES media_assets (id),
    ADD CONSTRAINT fk_word_audio_us FOREIGN KEY (audio_us_media_id) REFERENCES media_assets (id);

ALTER TABLE vocab_words
    DROP FOREIGN KEY fk_word_audio,
    DROP COLUMN audio_media_id;

-- ---------- 4. content_items: thời gian giới hạn làm bài ----------
-- Bằng chứng: card đề thi/bài luyện (PRACTICE_TEST, DICTATION_SET) hiển thị
-- rõ nhãn thời lượng (VD "40 phút"). NULL = không giới hạn thời gian (VD
-- VIDEO_LECTURE, GRAMMAR_ARTICLE, VOCAB_SET không cần).
ALTER TABLE content_items
    ADD COLUMN time_limit_minutes INT NULL AFTER order_index;
