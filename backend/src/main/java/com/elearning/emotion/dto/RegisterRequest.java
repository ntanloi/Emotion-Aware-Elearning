package com.elearning.emotion.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
        String password,

        @NotBlank(message = "Vai trò không được để trống")
        String role, // STUDENT | TEACHER

        String otp
) {
    public RegisterRequest(String fullName, String email, String password, String role) {
        this(fullName, email, password, role, null);
    }
}
