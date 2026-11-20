-- V30: He thong thanh toan thu ho, giu tien (Escrow), so cai vi giang vien va yeu cau rut tien (Payouts)

-- 1. Bo sung cac cot tai chinh, hoan tien va het han vao bang orders
ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(12, 2) NULL AFTER amount;
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'VIETQR' AFTER paid_amount;
ALTER TABLE orders ADD COLUMN platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER payment_method;
ALTER TABLE orders ADD COLUMN teacher_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER platform_fee;
ALTER TABLE orders ADD COLUMN refunded_at DATETIME NULL AFTER paid_at;
ALTER TABLE orders ADD COLUMN refund_reason VARCHAR(500) NULL AFTER refunded_at;
ALTER TABLE orders ADD COLUMN refund_ref_code VARCHAR(100) NULL AFTER refund_reason;
ALTER TABLE orders ADD COLUMN expired_at DATETIME NULL AFTER refund_ref_code;

CREATE INDEX idx_orders_expired_at ON orders(expired_at);

-- 2. Bang payment_transactions: luu toan bo webhook giao dich SePay gui sang de doi soat va chong duplicate
CREATE TABLE payment_transactions (
    id                CHAR(36) PRIMARY KEY,
    sepay_id          BIGINT NOT NULL UNIQUE,
    gateway           VARCHAR(50) NOT NULL DEFAULT 'SePay',
    transaction_date  DATETIME NULL,
    account_number    VARCHAR(50) NULL,
    sub_account       VARCHAR(50) NULL,
    transfer_type     VARCHAR(20) NULL,
    transfer_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    accumulated       DECIMAL(12, 2) NULL,
    code              VARCHAR(100) NULL,
    content           TEXT NULL,
    reference_code    VARCHAR(100) NULL,
    description       TEXT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED', -- MATCHED | UNMATCHED | AMOUNT_MISMATCH
    order_id          CHAR(36) NULL,
    raw_payload       TEXT NULL,
    admin_note        TEXT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_tx_sepay_id (sepay_id),
    INDEX idx_tx_status (status),
    INDEX idx_tx_created_at (created_at)
);

-- 3. Bang payout_requests: quan ly yeu cau rut tien cua giang vien
CREATE TABLE payout_requests (
    id                 CHAR(36) PRIMARY KEY,
    teacher_id         CHAR(36) NOT NULL,
    amount             DECIMAL(12, 2) NOT NULL,
    bank_id            VARCHAR(50) NOT NULL,
    bank_account_no    VARCHAR(50) NOT NULL,
    bank_account_name  VARCHAR(150) NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    admin_note         TEXT NULL,
    transaction_ref    VARCHAR(100) NULL,
    processed_at       DATETIME NULL,
    processed_by       CHAR(36) NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payout_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT fk_payout_admin FOREIGN KEY (processed_by) REFERENCES users(id),
    INDEX idx_payout_teacher (teacher_id),
    INDEX idx_payout_status (status),
    INDEX idx_payout_created_at (created_at)
);

-- 4. Bang teacher_wallet_entries: so cai ghi nhan bien dong vi cua giang vien (SALE, REFUND, PAYOUT)
CREATE TABLE teacher_wallet_entries (
    id                 CHAR(36) PRIMARY KEY,
    teacher_id         CHAR(36) NOT NULL,
    order_id           CHAR(36) NULL,
    payout_request_id  CHAR(36) NULL,
    type               VARCHAR(30) NOT NULL, -- SALE | REFUND | PAYOUT
    amount             DECIMAL(12, 2) NOT NULL, -- duong voi SALE, am voi REFUND va PAYOUT
    available_at       DATETIME NOT NULL,
    description        VARCHAR(500) NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT fk_wallet_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_wallet_payout FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE SET NULL,
    INDEX idx_wallet_teacher (teacher_id),
    INDEX idx_wallet_available_at (available_at),
    INDEX idx_wallet_type (type),
    INDEX idx_wallet_created_at (created_at)
);