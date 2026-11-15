-- Them cot status cho bang passages va questions de ho tro tinh nang ngung hoat dong / an cau hoi va doan van voi hoc vien
ALTER TABLE passages
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE questions
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
