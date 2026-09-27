-- V13: Tach cot passage_html thanh 2 cot rieng: transcript_html (Part 3/4 - transcript hoi thoai)
-- va passage_html (Part 6/7 - van ban doc).
-- Ly do: du lieu hien co trong passage_html thuc chat la noi dung transcript (bi nhap nham cot
-- luc do du lieu), nen doi ten cot cu -> transcript_html de GIU NGUYEN toan bo du lieu da co,
-- sau do tao lai cot passage_html moi (rong) danh rieng cho van ban doc that su.
ALTER TABLE passages RENAME COLUMN passage_html TO transcript_html;
ALTER TABLE passages ADD COLUMN passage_html LONGTEXT AFTER transcript_html;
