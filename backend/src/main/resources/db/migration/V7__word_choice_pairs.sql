-- Chon tu trong doan van — moi dong la 1 "blank" (2 lua chon) thuoc ve 1 cau hoi
-- (question_kind = WORD_CHOICE). question.prompt_text chua doan van day du, cac vi tri blank
-- duoc danh dau bang token {{1}}, {{2}}, ... theo dung thu tu order_index (1-based).
CREATE TABLE word_choice_pairs (
    id             CHAR(36) PRIMARY KEY,
    question_id    CHAR(36) NOT NULL,
    order_index    INT NOT NULL DEFAULT 0,
    option_a       VARCHAR(255) NOT NULL,
    option_b       VARCHAR(255) NOT NULL,
    correct_option CHAR(1) NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_word_choice_pair_question FOREIGN KEY (question_id) REFERENCES questions(id),
    CONSTRAINT chk_word_choice_correct_option CHECK (correct_option IN ('A', 'B'))
);
