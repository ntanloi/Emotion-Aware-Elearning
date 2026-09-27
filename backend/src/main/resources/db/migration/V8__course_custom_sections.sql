-- Cho phép giáo viên thêm mục nội dung tùy chỉnh vào sidebar khóa học (ngoài 10 mục cố định).
-- sectionCode lưu dạng CUSTOM_{id} (sinh tự động bởi backend UUID ngắn) để không bao giờ
-- trùng với 10 mục cố định (VOCAB/GRAMMAR/PART1-7/DICTATION).
CREATE TABLE course_custom_sections (
    id          CHAR(36) PRIMARY KEY,
    course_id   CHAR(36) NOT NULL,
    title       VARCHAR(100) NOT NULL,
    icon        VARCHAR(10)  NOT NULL DEFAULT '📌',
    order_index INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_custom_section_course FOREIGN KEY (course_id) REFERENCES courses(id)
);
