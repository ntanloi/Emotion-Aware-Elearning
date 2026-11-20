-- Cột pattern dùng collation không phân biệt dấu/hoa-thường của MySQL nên "đkm" bị coi là trùng "dkm"
-- (tương tự đcm/dcm, dm/đm, "địt mẹ"/"dit me", "đụ má"/"du ma") -> vi phạm UNIQUE uq_lex khi seed.
-- Bộ lọc kiểm duyệt khớp theo chuỗi có dấu và không dấu riêng, nên cần cả hai dạng -> so sánh theo nhị phân.
--
-- Bản tương thích TiDB: TiDB không cho đổi collation của cột đang nằm trong index,
-- nên xoá UNIQUE KEY uq_lex trước, đổi collation, rồi tạo lại.
ALTER TABLE moderation_lexicon DROP INDEX uq_lex;
ALTER TABLE moderation_lexicon MODIFY pattern VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE moderation_lexicon ADD UNIQUE KEY uq_lex (category, match_type, pattern);
