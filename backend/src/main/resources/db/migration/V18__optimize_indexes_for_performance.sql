-- V18: Bổ sung Composite Indexes để tối ưu hóa truy vấn danh sách câu hỏi và đoạn văn
-- Giảm thiểu thời gian truy vấn từ O(N) filesort xuống O(log N) B-Tree scan

CREATE INDEX idx_questions_item_order ON questions(content_item_id, order_index);
CREATE INDEX idx_passages_item_order ON passages(content_item_id, order_index);
CREATE INDEX idx_answer_options_q_label ON answer_options(question_id, label);
CREATE INDEX idx_word_choice_pairs_q_order ON word_choice_pairs(question_id, order_index);
CREATE INDEX idx_drag_drop_options_q_order ON drag_drop_options(question_id, display_order);
