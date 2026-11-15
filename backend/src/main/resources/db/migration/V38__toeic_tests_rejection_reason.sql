-- V38: Them cot rejection_reason vao bang toeic_tests de luu ly do tu choi duyet
ALTER TABLE toeic_tests
    ADD COLUMN rejection_reason TEXT NULL;
