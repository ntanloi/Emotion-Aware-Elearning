package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Mã định danh giảng viên duy nhất (VD: GV1001, GV9A8B7C) */
    @Column(name = "teacher_code", unique = true, length = 20)
    private String teacherCode;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    /** STUDENT | TEACHER | ADMIN */
    @Column(nullable = false, length = 20)
    private String role;

    /** ACTIVE | LOCKED | PENDING_APPROVAL */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private Integer tokenVersion = 0;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private Boolean mustChangePassword = false;

    /** Thông tin nhận thanh toán VietQR của Giảng viên */
    @Column(name = "bank_id", length = 50)
    private String bankId;

    @Column(name = "bank_account_no", length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name", length = 150)
    private String bankAccountName;

    /** H5 Item 5: Ghi nhận sự đồng ý dùng camera */
    @Column(name = "camera_consent_version", length = 20)
    private String cameraConsentVersion;

    @Column(name = "camera_consent_at")
    private LocalDateTime cameraConsentAt;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private Boolean emailVerified = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if ("TEACHER".equalsIgnoreCase(role) && (teacherCode == null || teacherCode.isBlank())) {
            teacherCode = generateTeacherCode();
        }
    }

    public static String generateTeacherCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder("GV");
        java.security.SecureRandom rnd = new java.security.SecureRandom();
        for (int i = 0; i < 6; i++) {
            sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        }
        return sb.toString();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
