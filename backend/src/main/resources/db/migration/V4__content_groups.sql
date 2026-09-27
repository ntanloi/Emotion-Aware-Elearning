-- ============================================================
-- V4: Them cap "Nhom hoat dong" (content_groups) giua Unit va Content Item.
--
-- Ly do: hien tai 1 Unit chi chua Content Item PHANG (khong nhom). Nhung mot so
-- Don vi thuc te (vd Ngu phap TOEIC) can gom nhieu hoat dong nho lai duoi 1 tieu
-- de chung, vd nhom "Danh tu" gom: 2 video bai giang + nhieu bai "Luyen tap"
-- (moi bai luyen tap lai co the chua cau hoi voi question_kind/so luong dap an
-- khac nhau - phan nay KHONG can doi vi da ho tro san o bang questions).
--
-- group_id la NULLABLE va khong doi gi o content_items hien co -> cac Don vi
-- dang dung kieu phang (khong nhom) tiep tuc hoat dong binh thuong, khong can
-- migrate du lieu cu.
-- ============================================================

CREATE TABLE content_groups (
                                id            CHAR(36) PRIMARY KEY,
                                unit_id       CHAR(36) NOT NULL,
                                title         VARCHAR(200) NOT NULL,
                                order_index   INT NOT NULL DEFAULT 0,
                                created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                                CONSTRAINT fk_group_unit FOREIGN KEY (unit_id) REFERENCES units(id),
                                INDEX idx_group_unit (unit_id)
);

ALTER TABLE content_items
    ADD COLUMN group_id CHAR(36) NULL AFTER unit_id,
    ADD CONSTRAINT fk_item_group FOREIGN KEY (group_id) REFERENCES content_groups(id);

CREATE INDEX idx_item_group ON content_items (group_id);