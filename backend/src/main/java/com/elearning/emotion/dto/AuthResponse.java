package com.elearning.emotion.dto;

public record AuthResponse(String accessToken, String userId, String fullName, String role, String status) {
    public AuthResponse(String accessToken, String userId, String fullName, String role) {
        this(accessToken, userId, fullName, role, null);
    }
}
