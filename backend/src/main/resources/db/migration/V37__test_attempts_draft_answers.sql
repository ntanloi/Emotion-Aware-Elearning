-- V37: Them cot draft_answers vao bang test_attempts de luu dap an nhap trong qua trinh lam bai
ALTER TABLE test_attempts
    ADD COLUMN draft_answers LONGTEXT NULL;
