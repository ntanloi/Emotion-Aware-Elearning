-- V35: Email OTP verification for registration via Gmail
ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE email_otp_verifications (
    id          CHAR(36) PRIMARY KEY,
    email       VARCHAR(150) NOT NULL,
    otp_code    VARCHAR(10) NOT NULL,
    type        VARCHAR(30) NOT NULL DEFAULT 'REGISTER',
    expires_at  DATETIME NOT NULL,
    used        TINYINT(1) NOT NULL DEFAULT 0,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_eov_email_type_used (email, type, used),
    INDEX idx_eov_expires_at (expires_at)
);
