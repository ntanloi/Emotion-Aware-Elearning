package com.elearning.emotion.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu Quản trị viên (ADMIN) tạo tài khoản Kiểm duyệt viên (MODERATOR).
 * Tài khoản MODERATOR không thể tự đăng ký công khai, chỉ ADMIN mới được cấp.
 */
public record CreateModeratorRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 150, message = "Email tối đa 150 ký tự")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự")
        String password
) {
}
