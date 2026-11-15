-- Migration V43: Khởi tạo/đồng bộ tài khoản Admin mặc định cho hệ thống
-- Tài khoản: admin@elearning.vn / Mật khẩu: Admin@123456
INSERT INTO users (
    id, full_name, email, password_hash, role, status, token_version, must_change_password, email_verified, created_at, updated_at
) VALUES (
    'b0b77cc8-411a-41ef-9907-b7ab72e78a19',
    'Quản trị viên Hệ thống',
    'admin@elearning.vn',
    '$2a$10$YPiAxXJk8e09KuX61ygtSO.so76ynejKjej9sME6UBP22erXI9CYi',
    'ADMIN',
    'ACTIVE',
    0,
    0,
    1,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    role = 'ADMIN',
    status = 'ACTIVE',
    email_verified = 1,
    must_change_password = 0;
