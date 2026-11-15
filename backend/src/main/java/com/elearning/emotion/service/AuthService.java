package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.EmailOtpVerification;
import com.elearning.emotion.entity.PasswordResetToken;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.EmailOtpVerificationRepository;
import com.elearning.emotion.repository.PasswordResetTokenRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.security.AuthInfoCache;
import com.elearning.emotion.security.JwtService;
import com.elearning.emotion.security.RateLimiterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailOtpVerificationRepository emailOtpVerificationRepository;
    private final AuthInfoCache authInfoCache;
    private final RateLimiterService rateLimiterService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    /**
     * Gửi mã OTP xác thực đăng ký tài khoản qua Gmail
     */
    @Transactional
    public Map<String, Object> sendRegisterOtp(String email, String fullName, String clientIp) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập địa chỉ email");
        }
        String cleanEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("Địa chỉ email này đã được đăng ký tài khoản");
        }

        rateLimiterService.checkSendOtpRateLimit(clientIp, cleanEmail);

        // Sinh mã OTP 6 chữ số ngẫu nhiên
        String otpCode = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        // Hủy các mã OTP chưa dùng trước đó của email này
        List<EmailOtpVerification> previousOtps = emailOtpVerificationRepository.findByEmailAndTypeAndUsedFalse(cleanEmail, "REGISTER");
        for (EmailOtpVerification old : previousOtps) {
            old.setUsed(true);
        }
        if (!previousOtps.isEmpty()) {
            emailOtpVerificationRepository.saveAll(previousOtps);
        }

        // Lưu bản ghi OTP mới với thời hạn 5 phút
        EmailOtpVerification verification = EmailOtpVerification.builder()
                .email(cleanEmail)
                .otpCode(otpCode)
                .type("REGISTER")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .attempts(0)
                .build();
        emailOtpVerificationRepository.save(verification);

        // Gửi email qua SMTP
        boolean sent = emailService.sendRegisterOtpEmail(cleanEmail, fullName, otpCode);
        log.info("[RegisterOTP] Đã tạo mã OTP cho {}: {} (Gửi mail thành công: {})", cleanEmail, otpCode, sent);

        String message;
        if (sent) {
            message = "Mã xác thực OTP đã được gửi đến email " + cleanEmail + ". Vui lòng kiểm tra hộp thư (cả mục Spam/Rác).";
        } else if (!emailService.isConfigured()) {
            message = "[Môi trường DEV] Chưa cấu hình SMTP Gmail trong backend/.env. Mã OTP kiểm thử của bạn là: " + otpCode;
        } else {
            message = "Không thể gửi email qua máy chủ SMTP. Mã OTP tạm thời là: " + otpCode + " (Vui lòng kiểm tra log backend).";
        }

        return Map.of(
                "success", true,
                "message", message,
                "devOtp", !sent ? otpCode : ""
        );
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (!com.elearning.emotion.entity.Role.isValidRegisterRole(req.role())) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Chỉ chấp nhận STUDENT hoặc TEACHER");
        }
        String cleanEmail = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        // Kiểm tra mã OTP nếu client truyền vào hoặc bắt buộc xác thực email
        if (req.otp() == null || req.otp().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mã xác thực OTP gửi qua email");
        }

        EmailOtpVerification otpRecord = emailOtpVerificationRepository
                .findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(cleanEmail, "REGISTER")
                .orElseThrow(() -> new IllegalArgumentException("Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng nhấn gửi lại mã."));

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng gửi lại mã mới.");
        }

        if (otpRecord.getAttempts() >= 5) {
            throw new IllegalArgumentException("Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
        }

        if (!otpRecord.getOtpCode().equals(req.otp().trim())) {
            otpRecord.setAttempts(otpRecord.getAttempts() + 1);
            emailOtpVerificationRepository.save(otpRecord);
            int remain = Math.max(0, 5 - otpRecord.getAttempts());
            throw new IllegalArgumentException("Mã OTP không chính xác. Bạn còn " + remain + " lần thử.");
        }

        // Đánh dấu mã OTP đã sử dụng
        otpRecord.setUsed(true);
        emailOtpVerificationRepository.save(otpRecord);

        String normalizedRole = req.role().trim().toUpperCase();
        // Quy trình xét duyệt giảng viên: người dùng đăng ký TEACHER sẽ được gán trạng thái PENDING_APPROVAL
        String initialStatus = "TEACHER".equals(normalizedRole) ? "PENDING_APPROVAL" : "ACTIVE";

        User user = User.builder()
                .fullName(req.fullName().trim())
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(normalizedRole)
                .status(initialStatus)
                .emailVerified(true)
                .build();
        user = userRepository.save(user);

        int tv = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
        String token = jwtService.generateAccessToken(user.getId(), user.getRole(), tv);
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getRole(), user.getStatus());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("Sai email hoặc mật khẩu"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Sai email hoặc mật khẩu");
        }
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            String reason = user.getStatusReason() != null && !user.getStatusReason().isBlank()
                    ? user.getStatusReason()
                    : "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
            throw new IllegalStateException("Tài khoản đã bị khóa: " + reason);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        int tv = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
        String token = jwtService.generateAccessToken(user.getId(), user.getRole(), tv);
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getRole(), user.getStatus());
    }

    /**
     * H5 Item 2: Yêu cầu đặt lại mật khẩu - Gửi mã OTP xác thực qua Gmail
     */
    @Transactional
    public Map<String, Object> requestPasswordReset(String email, String clientIp) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập địa chỉ email");
        }
        String cleanEmail = email.trim().toLowerCase();
        rateLimiterService.checkForgotPasswordRateLimit(clientIp, cleanEmail);

        User user = userRepository.findByEmail(cleanEmail).orElse(null);
        if (user == null) {
            // Chống user enumeration: thông báo như nhau để bảo mật
            return Map.of(
                    "success", true,
                    "message", "Nếu email đã được đăng ký, mã xác thực OTP đã được gửi đến hòm thư " + cleanEmail + "."
            );
        }

        // Hủy các mã OTP RESET_PASSWORD chưa dùng cũ của email này
        List<EmailOtpVerification> oldList = emailOtpVerificationRepository
                .findByEmailAndTypeAndUsedFalse(cleanEmail, "RESET_PASSWORD");
        for (EmailOtpVerification old : oldList) {
            old.setUsed(true);
        }
        emailOtpVerificationRepository.saveAll(oldList);

        // Sinh mã OTP 6 chữ số ngẫu nhiên
        String otpCode = String.format("%06d", new java.security.SecureRandom().nextInt(1_000_000));
        EmailOtpVerification verification = EmailOtpVerification.builder()
                .email(cleanEmail)
                .otpCode(otpCode)
                .type("RESET_PASSWORD")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .attempts(0)
                .build();
        emailOtpVerificationRepository.save(verification);

        // Gửi email qua SMTP
        boolean sent = emailService.sendResetPasswordOtpEmail(cleanEmail, user.getFullName(), otpCode);
        log.info("[PasswordResetOTP] Đã tạo mã OTP đặt lại mật khẩu cho {}: {} (Gửi mail thành công: {})",
                cleanEmail, otpCode, sent);

        String message;
        if (sent) {
            message = "Mã xác thực OTP đã được gửi đến email " + cleanEmail + ". Vui lòng kiểm tra hộp thư (cả mục Spam/Rác).";
        } else if (!emailService.isConfigured()) {
            message = "[Môi trường DEV] Chưa cấu hình SMTP Gmail trong backend/.env. Mã OTP kiểm thử của bạn là: " + otpCode;
        } else {
            message = "Không thể gửi email qua máy chủ SMTP. Mã OTP tạm thời là: " + otpCode + " (Vui lòng kiểm tra log backend).";
        }

        return Map.of(
                "success", true,
                "message", message,
                "devOtp", !sent ? otpCode : ""
        );
    }

    /**
     * H5 Item 2: Đặt lại mật khẩu mới bằng mã OTP hoặc token băm
     */
    @Transactional
    public Map<String, Object> resetPassword(ResetPasswordRequest req) {
        if (req.newPassword() == null || req.newPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        // 1. Luồng đặt lại mật khẩu bằng mã OTP gửi qua Gmail
        if (req.email() != null && !req.email().isBlank() && req.otp() != null && !req.otp().isBlank()) {
            String cleanEmail = req.email().trim().toLowerCase();
            String cleanOtp = req.otp().trim();

            EmailOtpVerification verification = emailOtpVerificationRepository
                    .findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(cleanEmail, "RESET_PASSWORD")
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mã OTP đặt lại mật khẩu hoặc mã đã được sử dụng. Vui lòng bấm gửi lại mã."));

            if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Mã OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng gửi lại mã mới.");
            }

            int attempts = verification.getAttempts() != null ? verification.getAttempts() : 0;
            if (attempts >= 5) {
                throw new IllegalArgumentException("Mã OTP đã bị khóa do nhập sai quá 5 lần. Vui lòng bấm gửi lại mã mới.");
            }

            if (!verification.getOtpCode().equals(cleanOtp)) {
                verification.setAttempts(attempts + 1);
                emailOtpVerificationRepository.save(verification);
                int remaining = 5 - (attempts + 1);
                throw new IllegalArgumentException("Mã xác thực OTP không chính xác. Bạn còn " + remaining + " lần thử.");
            }

            // OTP hợp lệ -> đánh dấu đã dùng
            verification.setUsed(true);
            emailOtpVerificationRepository.save(verification);

            User user = userRepository.findByEmail(cleanEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản người dùng với email " + cleanEmail));

            user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
            int currentTv = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
            user.setTokenVersion(currentTv + 1);
            userRepository.save(user);

            authInfoCache.evict(user.getId());
            notificationService.send(user.getId(), "Đặt lại mật khẩu thành công",
                    "Mật khẩu tài khoản E-Learning AI của bạn đã được thay đổi thành công.",
                    "SYSTEM", user.getId(), "/profile");

            log.info("[PasswordResetOTP] Đặt lại mật khẩu bằng OTP thành công cho user: {}", cleanEmail);
            return Map.of("success", true, "message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.");
        }

        // 2. Luồng đặt lại mật khẩu bằng token SHA-256 (tương thích ngược)
        if (req.token() != null && !req.token().isBlank()) {
            return resetPasswordWithToken(req.token().trim(), req.newPassword());
        }

        throw new IllegalArgumentException("Vui lòng cung cấp mã OTP và email hoặc mã xác thực hợp lệ");
    }

    public Map<String, Object> resetPassword(String rawToken, String newPassword) {
        return resetPassword(new ResetPasswordRequest(rawToken, newPassword));
    }

    private Map<String, Object> resetPasswordWithToken(String rawToken, String newPassword) {
        String tokenHash = sha256(rawToken);
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHashAndUsedFalseAndExpiresAtAfter(tokenHash, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException("Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại."));

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));

        int currentTv = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
        user.setTokenVersion(currentTv + 1);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        authInfoCache.evict(user.getId());
        log.info("[PasswordReset] Đặt lại mật khẩu thành công bằng token cho user: {}", user.getId());
        return Map.of("success", true, "message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.");
    }

    public UserProfileDto getProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
        return UserProfileDto.from(user);
    }

    @Transactional
    public UserProfileDto updateProfile(String userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }
        if (req.bankId() != null) {
            user.setBankId(req.bankId().trim());
        }
        if (req.bankAccountNo() != null) {
            user.setBankAccountNo(req.bankAccountNo().trim());
        }
        if (req.bankAccountName() != null) {
            user.setBankAccountName(req.bankAccountName().trim().toUpperCase());
        }

        // H5 Item 5: Ghi nhận sự đồng ý dùng camera
        if (req.cameraConsentVersion() != null && !req.cameraConsentVersion().isBlank()) {
            user.setCameraConsentVersion(req.cameraConsentVersion().trim());
            user.setCameraConsentAt(LocalDateTime.now());
        }

        User saved = userRepository.save(user);
        return UserProfileDto.from(saved);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Lỗi thuật toán SHA-256", e);
        }
    }
}
