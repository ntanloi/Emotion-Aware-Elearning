package com.elearning.emotion.service;

import com.elearning.emotion.dto.AuthResponse;
import com.elearning.emotion.dto.RegisterRequest;
import com.elearning.emotion.dto.ResetPasswordRequest;
import com.elearning.emotion.entity.EmailOtpVerification;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.EmailOtpVerificationRepository;
import com.elearning.emotion.repository.PasswordResetTokenRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.security.AuthInfoCache;
import com.elearning.emotion.security.JwtService;
import com.elearning.emotion.security.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceOtpRegistrationTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private EmailOtpVerificationRepository emailOtpVerificationRepository;
    @Mock
    private AuthInfoCache authInfoCache;
    @Mock
    private RateLimiterService rateLimiterService;
    @Mock
    private EmailService emailService;
    @Mock
    private NotificationService notificationService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                passwordResetTokenRepository,
                emailOtpVerificationRepository,
                authInfoCache,
                rateLimiterService,
                emailService,
                notificationService
        );
    }

    @Test
    void testSendRegisterOtp_Success() {
        when(userRepository.existsByEmail("user@gmail.com")).thenReturn(false);
        when(emailOtpVerificationRepository.findByEmailAndTypeAndUsedFalse("user@gmail.com", "REGISTER"))
                .thenReturn(List.of());
        when(emailService.sendRegisterOtpEmail(eq("user@gmail.com"), eq("Nguyễn Văn A"), anyString()))
                .thenReturn(true);

        Map<String, Object> result = authService.sendRegisterOtp("user@gmail.com", "Nguyễn Văn A", "127.0.0.1");

        assertNotNull(result);
        assertEquals(true, result.get("success"));

        ArgumentCaptor<EmailOtpVerification> captor = ArgumentCaptor.forClass(EmailOtpVerification.class);
        verify(emailOtpVerificationRepository).save(captor.capture());

        EmailOtpVerification saved = captor.getValue();
        assertEquals("user@gmail.com", saved.getEmail());
        assertEquals("REGISTER", saved.getType());
        assertEquals(6, saved.getOtpCode().length());
        assertFalse(saved.getUsed());
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    @Test
    void testSendRegisterOtp_EmailAlreadyExists_ThrowsException() {
        when(userRepository.existsByEmail("user@gmail.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.sendRegisterOtp("user@gmail.com", "Nguyễn Văn A", "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("đã được đăng ký"));
        verify(emailOtpVerificationRepository, never()).save(any());
        verify(emailService, never()).sendRegisterOtpEmail(any(), any(), any());
    }

    @Test
    void testRegisterWithValidOtp_Success() {
        String email = "hocvien@gmail.com";
        String otp = "123456";

        when(userRepository.existsByEmail(email)).thenReturn(false);

        EmailOtpVerification otpRecord = EmailOtpVerification.builder()
                .email(email)
                .otpCode(otp)
                .type("REGISTER")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .used(false)
                .attempts(0)
                .build();

        when(emailOtpVerificationRepository.findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(email, "REGISTER"))
                .thenReturn(Optional.of(otpRecord));

        when(passwordEncoder.encode("Secret123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-12345");
            return u;
        });
        when(jwtService.generateAccessToken(eq("u-12345"), eq("STUDENT"), anyInt())).thenReturn("mockJwtToken");

        RegisterRequest req = new RegisterRequest("Học Viên Mới", email, "Secret123", "STUDENT", otp);
        AuthResponse res = authService.register(req);

        assertNotNull(res);
        assertEquals("mockJwtToken", res.accessToken());
        assertEquals("u-12345", res.userId());
        assertEquals("STUDENT", res.role());
        assertEquals("ACTIVE", res.status());

        assertTrue(otpRecord.getUsed());
        verify(emailOtpVerificationRepository).save(otpRecord);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertTrue(userCaptor.getValue().getEmailVerified());
    }

    @Test
    void testRegisterWithInvalidOtp_IncrementsAttemptsAndThrows() {
        String email = "hocvien@gmail.com";

        when(userRepository.existsByEmail(email)).thenReturn(false);

        EmailOtpVerification otpRecord = EmailOtpVerification.builder()
                .email(email)
                .otpCode("123456")
                .type("REGISTER")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .used(false)
                .attempts(0)
                .build();

        when(emailOtpVerificationRepository.findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(email, "REGISTER"))
                .thenReturn(Optional.of(otpRecord));

        RegisterRequest req = new RegisterRequest("Học Viên Mới", email, "Secret123", "STUDENT", "999999");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.register(req)
        );

        assertTrue(ex.getMessage().contains("Mã OTP không chính xác"));
        assertEquals(1, otpRecord.getAttempts());
        assertFalse(otpRecord.getUsed());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testRequestPasswordReset_UserExists_SendsOtp() {
        String email = "hocvien@gmail.com";
        User user = User.builder()
                .id("user-uuid")
                .email(email)
                .fullName("Học Viên")
                .role("STUDENT")
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(emailOtpVerificationRepository.findByEmailAndTypeAndUsedFalse(email, "RESET_PASSWORD"))
                .thenReturn(List.of());
        when(emailService.sendResetPasswordOtpEmail(eq(email), eq("Học Viên"), anyString()))
                .thenReturn(true);

        Map<String, Object> res = authService.requestPasswordReset(email, "127.0.0.1");

        assertTrue((Boolean) res.get("success"));
        verify(emailOtpVerificationRepository).save(any(EmailOtpVerification.class));
        verify(emailService).sendResetPasswordOtpEmail(eq(email), eq("Học Viên"), anyString());
    }

    @Test
    void testResetPasswordWithOtp_Success() {
        String email = "hocvien@gmail.com";
        User user = User.builder()
                .id("user-uuid")
                .email(email)
                .passwordHash("old-hash")
                .tokenVersion(1)
                .build();

        EmailOtpVerification otpRecord = EmailOtpVerification.builder()
                .email(email)
                .otpCode("654321")
                .type("RESET_PASSWORD")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .used(false)
                .attempts(0)
                .build();

        when(emailOtpVerificationRepository.findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(email, "RESET_PASSWORD"))
                .thenReturn(Optional.of(otpRecord));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecret123")).thenReturn("new-hash");

        ResetPasswordRequest req = new ResetPasswordRequest(email, "654321", null, "NewSecret123");
        Map<String, Object> res = authService.resetPassword(req);

        assertTrue((Boolean) res.get("success"));
        assertTrue(otpRecord.getUsed());
        assertEquals("new-hash", user.getPasswordHash());
        assertEquals(2, user.getTokenVersion());
        verify(userRepository).save(user);
        verify(authInfoCache).evict(user.getId());
        verify(notificationService).send(eq(user.getId()), anyString(), anyString(), eq("SYSTEM"), eq(user.getId()), anyString());
    }
}
