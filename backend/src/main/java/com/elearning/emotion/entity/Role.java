package com.elearning.emotion.entity;

public enum Role {
    STUDENT,
    TEACHER,
    ADMIN;

    public static boolean isValidRegisterRole(String roleStr) {
        if (roleStr == null) return false;
        String r = roleStr.trim().toUpperCase();
        return STUDENT.name().equals(r) || TEACHER.name().equals(r);
    }
}
