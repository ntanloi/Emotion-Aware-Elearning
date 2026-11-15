-- V33: Cho phep sepay_id NULL trong payment_transactions
-- Muc dich: Tranh sinh ma id gia lap bang System.currentTimeMillis() khi payload SePay thieu id,
-- giup ghi nhan giao dich UNMATCHED an toan va khong bi duplicate khi SePay retry.

ALTER TABLE payment_transactions MODIFY COLUMN sepay_id BIGINT NULL;
