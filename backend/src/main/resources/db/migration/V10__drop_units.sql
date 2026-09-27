-- ============================================================
-- V10: Go bo tang "Unit" (don vi) - du thua giua Course va ContentGroup/ContentItem.
--
-- Ly do: 1 muc sidebar (section_code) chi can chua truc tiep danh sach Nhom hoat
-- dong (ContentGroup, vd "List 1", "List 2", "Danh tu") - dat ten rieng cho tang
-- trung gian "Unit" khong mang lai gia tri gi (giao vien luon phai tao 1 Unit roi
-- moi tao Nhom o trong, trong khi hoc vien bam vao sidebar la vao thang Nhom/hoat
-- dong, khong bao gio thay rieng man hinh "Unit").
--
-- content_groups.unit_id va content_items.unit_id duoc thay bang (course_id,
-- section_code) lay truc tiep tu units cua tung dong (JOIN qua unit_id cu truoc
-- khi xoa cot/bang).
-- ============================================================

-- ---------- content_groups: them course_id/section_code, chuyen du lieu tu units ----------
ALTER TABLE content_groups
    ADD COLUMN course_id CHAR(36) NULL AFTER unit_id,
    ADD COLUMN section_code VARCHAR(20) NULL AFTER course_id;

UPDATE content_groups cg
    JOIN units u ON u.id = cg.unit_id
    SET cg.course_id = u.course_id,
        cg.section_code = u.section_code;

ALTER TABLE content_groups
    MODIFY COLUMN course_id CHAR(36) NOT NULL,
    MODIFY COLUMN section_code VARCHAR(20) NOT NULL;

ALTER TABLE content_groups DROP FOREIGN KEY fk_group_unit;
ALTER TABLE content_groups DROP COLUMN unit_id;

ALTER TABLE content_groups
    ADD CONSTRAINT fk_group_course FOREIGN KEY (course_id) REFERENCES courses(id);

CREATE INDEX idx_group_course_section ON content_groups (course_id, section_code);

-- ---------- content_items: them course_id/section_code, chuyen du lieu tu units ----------
ALTER TABLE content_items
    ADD COLUMN course_id CHAR(36) NULL AFTER unit_id,
    ADD COLUMN section_code VARCHAR(20) NULL AFTER course_id;

UPDATE content_items ci
    JOIN units u ON u.id = ci.unit_id
    SET ci.course_id = u.course_id,
        ci.section_code = u.section_code;

ALTER TABLE content_items
    MODIFY COLUMN course_id CHAR(36) NOT NULL,
    MODIFY COLUMN section_code VARCHAR(20) NOT NULL;

ALTER TABLE content_items DROP FOREIGN KEY fk_item_unit;
ALTER TABLE content_items DROP COLUMN unit_id;

ALTER TABLE content_items
    ADD CONSTRAINT fk_item_course FOREIGN KEY (course_id) REFERENCES courses(id);

CREATE INDEX idx_item_course_section ON content_items (course_id, section_code);

-- ---------- Xoa bang units ----------
DROP TABLE units;
