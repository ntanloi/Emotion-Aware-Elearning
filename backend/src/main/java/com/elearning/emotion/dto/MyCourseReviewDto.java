package com.elearning.emotion.dto;

/**
 * Trang thai danh gia cua CHINH nguoi dang dang nhap doi voi 1 khoa hoc.
 * enrolled=false -> FE chi cho xem review, khong hien form danh gia (BR: chi hoc vien da dang ky moi duoc danh gia).
 * review != null -> hoc vien da danh gia roi, FE hien form o che do sua (PUT) thay vi tao moi (POST).
 */
public record MyCourseReviewDto(
        boolean enrolled,
        CourseReviewDto review
) {
}
