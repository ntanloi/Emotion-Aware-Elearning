package com.elearning.emotion.dto;

public record AuthResponse(String accessToken, String userId, String fullName, String role) {}
