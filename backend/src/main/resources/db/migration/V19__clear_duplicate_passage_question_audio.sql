-- V19: Xóa audio_media_id bị trùng lặp ở bảng questions khi câu hỏi trực thuộc một passage đã có audio.
-- Trong đề thi TOEIC (Part 3/4), audio là file nghe chung cho cả bài nói/hội thoại (thuộc bảng passages),
-- các câu hỏi con chỉ hiển thị nội dung câu hỏi và đáp án, không lưu/phát lại audio riêng để tránh lãng phí credit/bandwidth CDN.

UPDATE questions q
JOIN passages p ON q.passage_id = p.id
SET q.audio_media_id = NULL
WHERE q.audio_media_id IS NOT NULL 
  AND p.audio_media_id IS NOT NULL 
  AND q.audio_media_id = p.audio_media_id;
