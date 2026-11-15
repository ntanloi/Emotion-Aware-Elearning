package com.elearning.emotion.dto;

import java.time.LocalDateTime;

public record UserProfileDto(
        String id,
        String fullName,
        String email,
        String role,
        String status,
        String bankId,
        String bankAccountNo,
        String bankAccountName,
        String cameraConsentVersion,
        LocalDateTime cameraConsentAt
) {
    public static UserProfileDto from(com.elearning.emotion.entity.User u) {
        return new UserProfileDto(
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getRole(),
                u.getStatus(),
                u.getBankId(),
                u.getBankAccountNo(),
                u.getBankAccountName(),
                u.getCameraConsentVersion(),
                u.getCameraConsentAt()
        );
    }
}
