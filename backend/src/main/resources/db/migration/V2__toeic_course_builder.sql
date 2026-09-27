-- ============================================================
-- V2: Mô hình nội dung TOEIC nhiều giảng viên (thay thế 1 phần V1)
--
-- Bối cảnh: mỗi khoá học (courses) do 1 giảng viên biên soạn, sidebar của
-- MỌI khoá học đều có cùng bộ khung cố định:
--   Từ vựng TOEIC | Ngữ pháp TOEIC | Part 1..7 | Luyện nghe chép chính tả
-- ("Ôn tập Flashcards" KHÔNG lưu ở đây — là trang tổng hợp động, query từ
--  flashcard_progress của học viên trên toàn bộ từ vựng đã học, không do
--  giảng viên soạn nên không cần bảng riêng).
--
-- Thay thế hoàn toàn (xoá): lessons, quizzes, questions, answer_options,
-- quiz_results — mô hình generic cũ không đủ mô tả các dạng bài TOEIC thật
-- (Part 1 ảnh+audio, Part 3/4 hội thoại nhiều câu, Part 6/7 đoạn văn, ghép
-- cặp, chính tả...).
--
-- Giữ nguyên không đổi: users, courses, enrollments, chat_conversations,
-- chat_messages, ai_models, emotion_logs, daily_reports.
--
-- Đổi FK (lesson_id -> content_item_id): learning_sessions, adaptive_suggestions
-- (qua session), lesson_feedback — vì AI cảm xúc giờ chỉ áp dụng cho
-- content_items có type = 'VIDEO_LECTURE', không áp dụng cho bài tập/đề thi.
-- ============================================================

-- ---------- 0. Dọn mô hình cũ ----------
-- Phải xóa các foreign key constraints trước khi xóa bảng
-- MySQL không hỗ trợ IF EXISTS cho DROP FOREIGN KEY, nên dùng SET để bỏ qua lỗi nếu không tồn tại
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS quiz_results;
DROP TABLE IF EXISTS answer_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS lessons;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------- 1. Thư viện media dùng chung ----------
-- Giảng viên upload 1 lần, tái sử dụng nhiều nơi (ảnh từ vựng, audio câu hỏi,
-- video bài giảng...). Tách riêng để không lặp logic upload ở từng bảng.
CREATE TABLE media_assets (
    id            CHAR(36) PRIMARY KEY,
    uploader_id   CHAR(36) NOT NULL,
    type          VARCHAR(20) NOT NULL, -- IMAGE | AUDIO | VIDEO
    url           VARCHAR(500) NOT NULL,
    file_name     VARCHAR(255),
    duration_sec  INT NULL,             -- cho AUDIO / VIDEO
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_uploader FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- ---------- 2. Unit — nhóm nội dung bên trong 1 mục sidebar cố định ----------
-- VD: Từ vựng TOEIC > "Unit 1: Office", Part 5 > "Test 12", Ngữ pháp > "Unit 3: Thì hiện tại".
CREATE TABLE units (
    id            CHAR(36) PRIMARY KEY,
    course_id     CHAR(36) NOT NULL,
    section_code  VARCHAR(20) NOT NULL,
        -- VOCAB | GRAMMAR | PART1 | PART2 | PART3 | PART4 | PART5 | PART6 | PART7 | DICTATION
    title         VARCHAR(200) NOT NULL,
    order_index   INT NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_course FOREIGN KEY (course_id) REFERENCES courses(id),
    INDEX idx_unit_course_section (course_id, section_code)
);

-- ---------- 3. Content item — 1 hoạt động/trang nội dung trong 1 Unit ----------
CREATE TABLE content_items (
    id              CHAR(36) PRIMARY KEY,
    unit_id         CHAR(36) NOT NULL,
    type            VARCHAR(30) NOT NULL,
        -- VIDEO_LECTURE | VOCAB_SET | GRAMMAR_ARTICLE | PRACTICE_TEST | DICTATION_SET
    title           VARCHAR(200) NOT NULL,
    order_index     INT NOT NULL DEFAULT 0,
    video_media_id  CHAR(36) NULL,   -- dùng khi type = VIDEO_LECTURE
    body_html       LONGTEXT NULL,   -- dùng khi type = GRAMMAR_ARTICLE
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_unit FOREIGN KEY (unit_id) REFERENCES units(id),
    CONSTRAINT fk_item_video FOREIGN KEY (video_media_id) REFERENCES media_assets(id),
    INDEX idx_item_unit (unit_id)
);

-- ---------- 4. Từ vựng — thư viện riêng của từng giảng viên ----------
-- 1 từ có thể được dùng lại ở nhiều Unit/khoá học khác nhau của cùng giảng viên.
CREATE TABLE vocab_words (
    id              CHAR(36) PRIMARY KEY,
    teacher_id      CHAR(36) NOT NULL,
    word            VARCHAR(150) NOT NULL,
    ipa             VARCHAR(100),
    part_of_speech  VARCHAR(30),
    meaning_vi      TEXT NOT NULL,
    image_media_id  CHAR(36) NULL,
    audio_media_id  CHAR(36) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_word_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT fk_word_image FOREIGN KEY (image_media_id) REFERENCES media_assets(id),
    CONSTRAINT fk_word_audio FOREIGN KEY (audio_media_id) REFERENCES media_assets(id)
);

CREATE TABLE vocab_examples (
    id              CHAR(36) PRIMARY KEY,
    word_id         CHAR(36) NOT NULL,
    sentence_en     TEXT NOT NULL,
    sentence_vi     TEXT NOT NULL,
    audio_media_id  CHAR(36) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_example_word FOREIGN KEY (word_id) REFERENCES vocab_words(id),
    CONSTRAINT fk_example_audio FOREIGN KEY (audio_media_id) REFERENCES media_assets(id)
);

-- content_item (type=VOCAB_SET) chứa danh sách từ; hệ thống TỰ SINH các hoạt
-- động luyện tập (flashcard/trắc nghiệm/tìm cặp/nghe/điền từ) từ chính list này
-- ở tầng ứng dụng — giảng viên chỉ nhập 1 lần, không phải soạn riêng từng dạng bài.
CREATE TABLE vocab_set_items (
    id              CHAR(36) PRIMARY KEY,
    content_item_id CHAR(36) NOT NULL,
    word_id         CHAR(36) NOT NULL,
    order_index     INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vsi_item FOREIGN KEY (content_item_id) REFERENCES content_items(id),
    CONSTRAINT fk_vsi_word FOREIGN KEY (word_id) REFERENCES vocab_words(id),
    UNIQUE KEY uq_vocab_set_item (content_item_id, word_id)
);

-- ---------- 5. Đoạn văn/hội thoại dùng chung cho nhiều câu hỏi (Part 3/4/6/7) ----------
CREATE TABLE passages (
    id              CHAR(36) PRIMARY KEY,
    content_item_id CHAR(36) NOT NULL,
    passage_html    LONGTEXT,        -- văn bản đọc (Part 6/7) hoặc transcript (Part 3/4)
    audio_media_id  CHAR(36) NULL,   -- Part 3/4
    image_media_id  CHAR(36) NULL,   -- Part 7: ảnh email/biểu mẫu kèm theo
    order_index     INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_passage_item FOREIGN KEY (content_item_id) REFERENCES content_items(id),
    CONSTRAINT fk_passage_audio FOREIGN KEY (audio_media_id) REFERENCES media_assets(id),
    CONSTRAINT fk_passage_image FOREIGN KEY (image_media_id) REFERENCES media_assets(id)
);

-- ---------- 6. Câu hỏi — dùng chung mọi dạng bài (Part 1-7, ngữ pháp, chính tả) ----------
CREATE TABLE questions (
    id              CHAR(36) PRIMARY KEY,
    content_item_id CHAR(36) NOT NULL,
    passage_id      CHAR(36) NULL,   -- NULL nếu câu hỏi độc lập (Part 1,2,5; ngữ pháp; chính tả)
    question_kind   VARCHAR(20) NOT NULL, -- MULTIPLE_CHOICE | FILL_BLANK | MATCHING | DICTATION
    prompt_text     TEXT,
    image_media_id  CHAR(36) NULL,   -- Part 1: ảnh mô tả
    audio_media_id  CHAR(36) NULL,   -- Part 1,2 hoặc câu hỏi có nghe
    order_index     INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_question_item FOREIGN KEY (content_item_id) REFERENCES content_items(id),
    CONSTRAINT fk_question_passage FOREIGN KEY (passage_id) REFERENCES passages(id),
    CONSTRAINT fk_question_image FOREIGN KEY (image_media_id) REFERENCES media_assets(id),
    CONSTRAINT fk_question_audio FOREIGN KEY (audio_media_id) REFERENCES media_assets(id),
    INDEX idx_question_item (content_item_id)
);

CREATE TABLE answer_options (
    id           CHAR(36) PRIMARY KEY,
    question_id  CHAR(36) NOT NULL,
    label        VARCHAR(5),           -- A/B/C/D
    content      VARCHAR(500) NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_option_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Đáp án dạng chữ (điền từ ngữ pháp / chính tả) — chấm bằng so khớp chuỗi
CREATE TABLE text_answers (
    id            CHAR(36) PRIMARY KEY,
    question_id   CHAR(36) NOT NULL UNIQUE,
    correct_text  VARCHAR(500) NOT NULL,
    hint          VARCHAR(255),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_textans_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Ghép cặp — mỗi dòng là 1 cặp thuộc về 1 "câu hỏi ghép cặp" (question_kind = MATCHING)
CREATE TABLE matching_pairs (
    id            CHAR(36) PRIMARY KEY,
    question_id   CHAR(36) NOT NULL,
    left_content  VARCHAR(255) NOT NULL,
    right_content VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pair_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- ---------- 7. Lượt làm bài + đáp án học viên ----------
CREATE TABLE attempts (
    id              CHAR(36) PRIMARY KEY,
    user_id         CHAR(36) NOT NULL,
    content_item_id CHAR(36) NOT NULL,
    started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at    DATETIME NULL,
    score           FLOAT NULL,
    total_questions INT NULL,
    correct_count   INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempt_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_attempt_item FOREIGN KEY (content_item_id) REFERENCES content_items(id),
    INDEX idx_attempt_user (user_id)
);

CREATE TABLE attempt_answers (
    id                  CHAR(36) PRIMARY KEY,
    attempt_id          CHAR(36) NOT NULL,
    question_id         CHAR(36) NOT NULL,
    selected_option_id  CHAR(36) NULL,
    submitted_text      VARCHAR(500) NULL,
    is_correct          BOOLEAN NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_aa_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(id),
    CONSTRAINT fk_aa_question FOREIGN KEY (question_id) REFERENCES questions(id),
    CONSTRAINT fk_aa_option FOREIGN KEY (selected_option_id) REFERENCES answer_options(id)
);

-- ---------- 8. Tiến độ ôn Flashcard cá nhân (nguồn dữ liệu cho trang "Ôn tập Flashcards") ----------
CREATE TABLE flashcard_progress (
    id                CHAR(36) PRIMARY KEY,
    user_id           CHAR(36) NOT NULL,
    word_id           CHAR(36) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'NEW', -- NEW | LEARNING | MASTERED
    last_reviewed_at  DATETIME NULL,
    next_review_at    DATETIME NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fp_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fp_word FOREIGN KEY (word_id) REFERENCES vocab_words(id),
    UNIQUE KEY uq_flashcard_progress (user_id, word_id)
);

-- ---------- 9. Nối lại AI/emotion sang content_items (chỉ dùng khi type=VIDEO_LECTURE) ----------
ALTER TABLE learning_sessions DROP FOREIGN KEY fk_session_lesson;
ALTER TABLE learning_sessions CHANGE COLUMN lesson_id content_item_id CHAR(36) NOT NULL;
ALTER TABLE learning_sessions
    ADD CONSTRAINT fk_session_item FOREIGN KEY (content_item_id) REFERENCES content_items(id);

ALTER TABLE lesson_feedback DROP FOREIGN KEY fk_feedback_lesson;
ALTER TABLE lesson_feedback CHANGE COLUMN lesson_id content_item_id CHAR(36) NOT NULL;
ALTER TABLE lesson_feedback
    ADD CONSTRAINT fk_feedback_item FOREIGN KEY (content_item_id) REFERENCES content_items(id);

-- Lưu ý ràng buộc nghiệp vụ (không thể ép bằng FK trong MySQL, xử lý ở tầng service):
-- learning_sessions.content_item_id CHỈ được trỏ tới content_items có type = 'VIDEO_LECTURE'.
-- Application layer (SessionService) phải validate điều này trước khi tạo session.
