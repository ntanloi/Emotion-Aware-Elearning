package com.elearning.emotion.dto;

import com.elearning.emotion.entity.User;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AdminUserDto {
    String id;
    String fullName;
    String email;
    String role;
    String status;
    String statusReason;
    Integer tokenVersion;
    LocalDateTime lastLoginAt;
    LocalDateTime createdAt;
    Long enrolledCoursesCount;
    Long createdCoursesCount;

    public static AdminUserDto from(User u, Number enrolledCount, Number createdCount) {
        return AdminUserDto.builder()
                .id(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .role(u.getRole())
                .status(u.getStatus())
                .statusReason(u.getStatusReason())
                .tokenVersion(u.getTokenVersion())
                .lastLoginAt(u.getLastLoginAt())
                .createdAt(u.getCreatedAt())
                .enrolledCoursesCount(enrolledCount != null ? enrolledCount.longValue() : 0L)
                .createdCoursesCount(createdCount != null ? createdCount.longValue() : 0L)
                .build();
    }
}
