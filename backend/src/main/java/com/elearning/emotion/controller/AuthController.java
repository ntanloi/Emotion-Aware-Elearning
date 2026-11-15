package com.elearning.emotion.controller;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.security.RateLimiterService;
import com.elearning.emotion.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;

    @PostMapping("/register/send-otp")
    public ResponseEntity<Map<String, Object>> sendRegisterOtp(
            @Valid @RequestBody SendOtpRequest req,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        return ResponseEntity.ok(authService.sendRegisterOtp(req.email(), req.fullName(), clientIp));
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request) {
        String clientIp = getClientIp(request);
        rateLimiterService.checkRegisterRateLimit(clientIp);
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        String clientIp = getClientIp(request);
        rateLimiterService.checkLoginRateLimit(clientIp, req.email());
        return authService.login(req);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest req,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        return ResponseEntity.ok(authService.requestPasswordReset(req.email(), clientIp));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req));
    }

    @GetMapping("/profile")
    public UserProfileDto getProfile(@AuthenticationPrincipal String userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn");
        }
        return authService.getProfile(userId);
    }

    @PutMapping("/profile")
    public UserProfileDto updateProfile(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody UpdateProfileRequest req) {
        if (userId == null) {
            throw new IllegalArgumentException("Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn");
        }
        return authService.updateProfile(userId, req);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
