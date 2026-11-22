package com.elearning.emotion.entity;

public enum Role {
    STUDENT,
    TEACHER,
    /** Kiểm duyệt viên: chỉ xử lý nghiệp vụ kiểm duyệt (khóa học, đề thi, đánh giá, từ điển, hồ sơ giảng viên). */
    MODERATOR,
    ADMIN;

    public static boolean isValidRegisterRole(String roleStr) {
        if (roleStr == null) return false;
        String r = roleStr.trim().toUpperCase();
        return STUDENT.name().equals(r) || TEACHER.name().equals(r);
    }
}
