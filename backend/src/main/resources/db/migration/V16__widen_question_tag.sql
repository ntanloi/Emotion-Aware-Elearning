-- V14 gioi han tag VARCHAR(100) qua nho: tu ban Study4->EL Sync v5.1, script lay NGUYEN VEN
-- phan chu sau "N: " lam tag (thay vi chi phan trong ngoac vuong nhu ban cu) de khong bi cat
-- mat ten nhom hoat dong dai (vd "Tranh ta ca nguoi va vat"), nen chuoi tag co the dai hon
-- 100 ky tu va gay loi "Data truncation: Data too long for column 'tag'" khi INSERT.
ALTER TABLE questions
    MODIFY COLUMN tag VARCHAR(255) NULL;
