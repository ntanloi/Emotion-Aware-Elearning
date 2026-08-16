package com.elearning.emotion.service;

import com.elearning.emotion.dto.AuthResponse;
import com.elearning.emotion.dto.LoginRequest;
import com.elearning.emotion.dto.RegisterRequest;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email da duoc su dung");
        }
        User user = User.builder()
                .fullName(req.fullName())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(req.role())
                .build();
        user = userRepository.save(user);
        String token = jwtService.generateAccessToken(user.getId(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getRole());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("Sai email hoac mat khau"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Sai email hoac mat khau");
        }
        String token = jwtService.generateAccessToken(user.getId(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getRole());
    }
}
