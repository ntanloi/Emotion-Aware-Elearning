-- V9: Thêm trường explanation (giải thích đáp án) vào bảng questions
-- Giáo viên có thể tùy chọn thêm giải thích đáp án cho mỗi câu hỏi.
-- Nếu có giải thích, học viên sẽ thấy nút dropdown "Giải thích" sau khi kiểm tra đáp án.

ALTER TABLE questions ADD COLUMN explanation TEXT NULL;
