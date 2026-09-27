-- Them cot "tag" cho cau hoi doc lap thuoc cac pool luyen tap co category rieng (vi du:
-- Practice Zone Part 1 co 3 tag "[Part 1] Tranh ta nguoi" / "Tranh ta vat" / "Tranh ta ca
-- nguoi va vat"). NULL cho cau hoi khong thuoc pool nao (Part 2-7, ngu phap, chinh ta...).
ALTER TABLE questions
    ADD COLUMN tag VARCHAR(100) NULL AFTER prompt_text;

CREATE INDEX idx_question_tag ON questions (tag);