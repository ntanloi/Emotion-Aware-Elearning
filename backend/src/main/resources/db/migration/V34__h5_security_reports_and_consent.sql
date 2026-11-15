-- V34: H5 - Rate limiting, Password reset tokens, Content reports, and Camera consent logging

-- 1. Camera consent logging in users and learning_sessions
ALTER TABLE users ADD COLUMN camera_consent_version VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN camera_consent_at DATETIME NULL;

ALTER TABLE learning_sessions ADD COLUMN consent_version VARCHAR(20) NULL;
ALTER TABLE learning_sessions ADD COLUMN consent_at DATETIME NULL;

-- 2. Password reset tokens table (H5 Item 2)
CREATE TABLE password_reset_tokens (
    id          CHAR(36) PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    used        TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_prt_token_hash (token_hash),
    INDEX idx_prt_expires_at (expires_at)
);

-- 3. Content & Teacher reports table (H5 Item 3)
CREATE TABLE content_reports (
    id           CHAR(36) PRIMARY KEY,
    reporter_id  CHAR(36) NOT NULL,
    target_type  VARCHAR(30) NOT NULL, -- COURSE | TEACHER | CONTENT_ITEM | REVIEW
    target_id    CHAR(36) NOT NULL,
    reason       VARCHAR(50) NOT NULL, -- COPYRIGHT | INAPPROPRIATE_CONTENT | SPAM | HARASSMENT | OTHER
    description  TEXT NULL,
    status       VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING | DISMISSED | WARNED | SUSPENDED | LOCKED
    admin_note   TEXT NULL,
    handled_by   CHAR(36) NULL,
    handled_at   DATETIME NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cr_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cr_admin FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cr_status (status),
    INDEX idx_cr_target (target_type, target_id),
    INDEX idx_cr_created_at (created_at)
);
