-- V47: Bổ sung teacher_code cho users và liên kết payout_request_id trong payment_transactions

-- 1. Bổ sung mã định danh giảng viên teacher_code vào bảng users
-- (TiDB không hỗ trợ ADD COLUMN kèm UNIQUE trong cùng một lệnh => tách thành 2 lệnh)
ALTER TABLE users ADD COLUMN teacher_code VARCHAR(20) NULL AFTER email;

-- Cập nhật teacher_code tự động cho các tài khoản giảng viên hiện có
UPDATE users 
SET teacher_code = CONCAT('GV', UPPER(SUBSTRING(REPLACE(id, '-', ''), 1, 6))) 
WHERE role = 'TEACHER' AND (teacher_code IS NULL OR teacher_code = '');

-- Thêm UNIQUE sau khi đã điền dữ liệu
ALTER TABLE users ADD UNIQUE INDEX uk_users_teacher_code (teacher_code);

-- 2. Bổ sung liên kết payout_request_id vào payment_transactions để lưu giao dịch SePay chuyển tiền đi (out)
ALTER TABLE payment_transactions ADD COLUMN payout_request_id CHAR(36) NULL AFTER order_id;
ALTER TABLE payment_transactions ADD CONSTRAINT fk_tx_payout FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE SET NULL;
ALTER TABLE payment_transactions ADD INDEX idx_tx_payout (payout_request_id);