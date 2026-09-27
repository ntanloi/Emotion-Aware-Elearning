-- Giai đoạn 3c: Luyện nghe chép chính tả TỰ SINH từ thư viện từ vựng của giáo viên.
-- Mỗi câu hỏi DICTATION được "vật chất hoá" (materialize) từ 1 VocabWord tại thời điểm giáo
-- viên bấm "Sinh câu luyện chính tả" - xem DictationGeneratorService. Cột này CHỈ để biết
-- nguồn gốc câu hỏi (phục vụ nút "Sinh lại" xoá đúng các câu cũ), KHÔNG dùng để tự đồng bộ khi
-- giáo viên sửa VocabWord gốc sau này (coi như "chốt đề" tại thời điểm sinh).
ALTER TABLE questions
    ADD COLUMN source_vocab_word_id CHAR(36) NULL,
    ADD CONSTRAINT fk_question_source_word FOREIGN KEY (source_vocab_word_id)
        REFERENCES vocab_words(id) ON DELETE SET NULL;

CREATE INDEX idx_question_source_word ON questions(source_vocab_word_id);
