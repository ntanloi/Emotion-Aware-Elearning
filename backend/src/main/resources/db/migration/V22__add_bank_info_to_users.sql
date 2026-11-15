-- V22: Them thong tin tai khoan ngan hang cho nguoi dung (Giang vien nhan thanh toan)
ALTER TABLE users
  ADD COLUMN bank_id VARCHAR(50) NULL,
  ADD COLUMN bank_account_no VARCHAR(50) NULL,
  ADD COLUMN bank_account_name VARCHAR(150) NULL;
