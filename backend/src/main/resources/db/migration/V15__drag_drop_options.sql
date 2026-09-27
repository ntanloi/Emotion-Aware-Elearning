-- Keo tha — moi dong la 1 "the" trong ngan keo (word bank) thuoc ve 1 cau hoi
-- (question_kind = DRAG_DROP). question.prompt_text chua cau/doan van day du, cac vi tri o
-- trong duoc danh dau bang token {{1}}, {{2}}, ... blank_order = vi tri o trong ma the nay la
-- dap an DUNG (NULL = the moi/distractor, khong khop o trong nao).
CREATE TABLE drag_drop_options (
    id             CHAR(36) PRIMARY KEY,
    question_id    CHAR(36) NOT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    blank_order    INT NULL,
    text           VARCHAR(255) NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_drag_drop_option_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX idx_drag_drop_options_question_id ON drag_drop_options(question_id);
