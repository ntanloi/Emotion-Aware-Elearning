-- V12: Sua kieu du lieu cot rating trong course_reviews tu TINYINT sang INT.
-- Ly do: entity CourseReview.rating khai bao la Integer (Java) -> Hibernate schema-validation
-- mong doi cot SQL kieu INTEGER, trong khi V11 tao TINYINT -> loi khi start app:
-- "Schema-validation: wrong column type encountered in column [rating] ... found [tinyint], but expecting [integer]"
ALTER TABLE course_reviews MODIFY COLUMN rating INT NOT NULL;
