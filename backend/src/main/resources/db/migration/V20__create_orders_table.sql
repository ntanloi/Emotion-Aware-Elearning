-- V20: Tao bang orders de quan ly don hang dang ky khoa hoc va thanh toan QR Code
CREATE TABLE orders (
    id            CHAR(36) PRIMARY KEY,
    order_code    VARCHAR(50) NOT NULL UNIQUE,
    user_id       CHAR(36) NOT NULL,
    course_id     CHAR(36) NOT NULL,
    amount        DECIMAL(12, 2) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | CANCELLED
    qr_url        TEXT NULL,
    paid_at       DATETIME NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_order_course FOREIGN KEY (course_id) REFERENCES courses(id),
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_course (course_id),
    INDEX idx_orders_status (status)
);
