-- ============================================================
-- V46: Student Wallet, Reward Escrow (10%), Video View Attempts,
-- Course Access Period, and Withdrawal Foundation (Phase 1)
-- ============================================================

-- 1. Bang vi hoc vien (student_wallets)
CREATE TABLE student_wallets (
    user_id       CHAR(36)      NOT NULL,
    cash_balance  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    bonus_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    topup_code    VARCHAR(11)   NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_sw_topup_code (topup_code),
    CONSTRAINT fk_sw_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT ck_sw_nonneg CHECK (cash_balance >= 0 AND bonus_balance >= 0)
);

-- 2. Bang yeu cau rut tien cua hoc vien (wallet_withdrawals)
CREATE TABLE wallet_withdrawals (
    id                CHAR(36)      NOT NULL,
    user_id           CHAR(36)      NOT NULL,
    amount            DECIMAL(14,2) NOT NULL,
    from_cash         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    from_bonus        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    bank_id           VARCHAR(50)   NOT NULL,
    bank_account_no   VARCHAR(50)   NOT NULL,
    bank_account_name VARCHAR(150)  NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING | PAID | REJECTED
    admin_note        TEXT          NULL,
    transaction_ref   VARCHAR(100)  NULL,
    processed_by      CHAR(36)      NULL,
    processed_at      DATETIME      NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_ww_user (user_id, created_at),
    KEY ix_ww_status (status, created_at),
    CONSTRAINT fk_ww_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ww_processed_by FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- 3. So cai vi hoc vien (wallet_entries): chi ghi them, khong sua, khong xoa
CREATE TABLE wallet_entries (
    id                     CHAR(36)      NOT NULL,
    user_id                CHAR(36)      NOT NULL,
    type                   VARCHAR(20)   NOT NULL,  -- TOPUP | PURCHASE | REWARD | ADJUST | WITHDRAW | WITHDRAW_REVERSE
    bucket                 VARCHAR(10)   NOT NULL,  -- CASH | BONUS
    amount                 DECIMAL(14,2) NOT NULL,  -- duong la cong, am la tru
    cash_after             DECIMAL(14,2) NOT NULL,
    bonus_after            DECIMAL(14,2) NOT NULL,
    payment_transaction_id CHAR(36)      NULL,
    order_id               CHAR(36)      NULL,
    escrow_id              CHAR(36)      NULL,
    withdrawal_id          CHAR(36)      NULL,
    description            VARCHAR(500)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_we_user_time (user_id, created_at),
    UNIQUE KEY uq_we_topup (payment_transaction_id, type),
    UNIQUE KEY uq_we_order (order_id, type, bucket),
    UNIQUE KEY uq_we_escrow (escrow_id, type),
    UNIQUE KEY uq_we_withdrawal (withdrawal_id, type, bucket),
    CONSTRAINT fk_we_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Bo sung cot cho orders
ALTER TABLE orders ADD COLUMN reward_escrow_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER platform_fee;
ALTER TABLE orders ADD COLUMN fee_percent DECIMAL(5,2) NULL;
ALTER TABLE orders ADD COLUMN escrow_percent DECIMAL(5,2) NULL;
ALTER TABLE orders ADD COLUMN policy_version VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN reward_terms_accepted_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN access_months INT NULL;

-- 5. Bo sung cot cho payment_transactions
ALTER TABLE payment_transactions ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'ORDER';
ALTER TABLE payment_transactions ADD COLUMN topup_user_id CHAR(36) NULL;
ALTER TABLE payment_transactions ADD CONSTRAINT fk_tx_topup_user FOREIGN KEY (topup_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payment_transactions ADD INDEX idx_tx_topup_user (topup_user_id);

-- 6. Bang quan ly giu tien thuong 10% (reward_escrows)
CREATE TABLE reward_escrows (
    id               CHAR(36)      NOT NULL,
    order_id         CHAR(36)      NOT NULL,
    user_id          CHAR(36)      NOT NULL,
    course_id        CHAR(36)      NOT NULL,
    teacher_id       CHAR(36)      NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'HOLDING', -- HOLDING | CLAIMED | RELEASED
    required_percent DECIMAL(5,2)  NOT NULL,
    policy_version   VARCHAR(20)   NOT NULL,
    holding_until    DATETIME      NOT NULL,
    settled_at       DATETIME      NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_re_order (order_id),
    KEY ix_re_status_until (status, holding_until),
    KEY ix_re_user_course (user_id, course_id),
    CONSTRAINT fk_re_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_re_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_re_course FOREIGN KEY (course_id) REFERENCES courses(id),
    CONSTRAINT fk_re_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 7. Snapshot danh sach video bat buoc tai thoi diem mua (reward_escrow_videos)
CREATE TABLE reward_escrow_videos (
    escrow_id       CHAR(36) NOT NULL,
    content_item_id CHAR(36) NOT NULL,
    PRIMARY KEY (escrow_id, content_item_id),
    CONSTRAINT fk_rev_escrow FOREIGN KEY (escrow_id) REFERENCES reward_escrows(id) ON DELETE CASCADE,
    CONSTRAINT fk_rev_content_item FOREIGN KEY (content_item_id) REFERENCES content_items(id)
);

-- 8. Bang luot xem video hop le (video_view_attempts)
CREATE TABLE video_view_attempts (
    id                CHAR(36)        NOT NULL,
    user_id           CHAR(36)        NOT NULL,
    content_item_id   CHAR(36)        NOT NULL,
    status            VARCHAR(10)     NOT NULL DEFAULT 'OPEN', -- OPEN | VALID | INVALID | EXPIRED
    duration_sec      INT             NOT NULL DEFAULT 0,
    bin_sec           INT             NOT NULL DEFAULT 10,
    covered_bins      VARBINARY(1024) NOT NULL,                -- BitSet: bit i = doan [i*bin, (i+1)*bin) da xem co mat
    samples_total     INT             NOT NULL DEFAULT 0,
    samples_noface    INT             NOT NULL DEFAULT 0,
    samples_bored     INT             NOT NULL DEFAULT 0,
    bored_run_frames  INT             NOT NULL DEFAULT 0,      -- do dai doan BORED dang chay
    bored_gap_frames  INT             NOT NULL DEFAULT 0,      -- so khung lien tiep khong phai BORED xen vao
    bored_idle_frames INT             NOT NULL DEFAULT 0,      -- tong khung bi coi la treo may
    bored_run_flagged TINYINT(1)      NOT NULL DEFAULT 0,
    last_activity_at  DATETIME        NOT NULL,
    finalized_at      DATETIME        NULL,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_vva_user_item (user_id, content_item_id, status),
    KEY ix_vva_status_activity (status, last_activity_at),
    CONSTRAINT fk_vva_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_vva_content_item FOREIGN KEY (content_item_id) REFERENCES content_items(id)
);

-- 9. Bo sung cot cho learning_sessions
ALTER TABLE learning_sessions ADD COLUMN attempt_id CHAR(36) NULL;
ALTER TABLE learning_sessions ADD COLUMN face_lost_since DATETIME NULL;
ALTER TABLE learning_sessions ADD COLUMN camera_choice VARCHAR(3) NULL;
ALTER TABLE learning_sessions ADD INDEX idx_ls_attempt_id (attempt_id);

-- 10. Bo sung thoi han khoa hoc cho courses
ALTER TABLE courses
    ADD COLUMN access_months INT NOT NULL DEFAULT 6;

-- 11. Bo sung thoi han va chu ky hoc cho enrollments
ALTER TABLE enrollments ADD COLUMN access_months INT NULL;
ALTER TABLE enrollments ADD COLUMN started_at DATETIME NULL;
ALTER TABLE enrollments ADD COLUMN expires_at DATETIME NULL;