package com.elearning.emotion.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * H5 Item 1: Bộ đếm trượt (Sliding Window In-Memory Rate Limiter)
 * Giới hạn tần suất request theo IP và định danh (email/userId) để phòng chống Brute-Force & DoS
 */
@Service
@Slf4j
public class RateLimiterService {

    private final Map<String, Deque<Long>> requestWindows = new ConcurrentHashMap<>();

    /**
     * Kiểm tra và ghi nhận lượt truy cập bằng thuật toán Sliding Window
     * @param key Khóa định danh (vd: ip:1.2.3.4 hoặc email:user@test.vn)
     * @param maxRequests Số lượt yêu cầu tối đa cho phép
     * @param windowSeconds Độ dài khung trượt (giây)
     * @return true nếu được phép thực hiện, false nếu đã vượt ngưỡng
     */
    public synchronized boolean tryAcquire(String key, int maxRequests, long windowSeconds) {
        long now = Instant.now().getEpochSecond();
        long windowStart = now - windowSeconds;

        Deque<Long> timestamps = requestWindows.computeIfAbsent(key, k -> new ArrayDeque<>());

        // Loại bỏ các mốc thời gian đã trôi ra ngoài cửa sổ trượt
        while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxRequests) {
            log.warn("[RateLimiter] Khóa '{}' vượt quá giới hạn ({}/{} req trong {}s)", key, timestamps.size(), maxRequests, windowSeconds);
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    /**
     * Giới hạn tần suất đăng nhập: Tối đa 5 lần thử trong 5 phút theo IP và Email
     */
    public void checkLoginRateLimit(String clientIp, String email) {
        String ipKey = "login:ip:" + (clientIp != null ? clientIp : "unknown");
        if (!tryAcquire(ipKey, 10, 300)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "IP của bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 5 phút.");
        }

        if (email != null && !email.isBlank()) {
            String emailKey = "login:email:" + email.trim().toLowerCase();
            if (!tryAcquire(emailKey, 5, 300)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Tài khoản này đang có quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 5 phút.");
            }
        }
    }

    /**
     * Giới hạn tần suất đăng ký: Tối đa 5 tài khoản trong 10 phút từ cùng 1 IP
     */
    public void checkRegisterRateLimit(String clientIp) {
        String ipKey = "register:ip:" + (clientIp != null ? clientIp : "unknown");
        if (!tryAcquire(ipKey, 5, 600)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Đã có quá nhiều lượt đăng ký từ mạng của bạn. Vui lòng thử lại sau 10 phút.");
        }
    }

    /**
     * Giới hạn tần suất yêu cầu quên mật khẩu: Tối đa 3 lần trong 10 phút theo Email và IP
     */
    public void checkForgotPasswordRateLimit(String clientIp, String email) {
        String ipKey = "forgot:ip:" + (clientIp != null ? clientIp : "unknown");
        if (!tryAcquire(ipKey, 5, 600)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Đã gửi quá nhiều yêu cầu đặt lại mật khẩu từ IP của bạn. Vui lòng thử lại sau 10 phút.");
        }

        if (email != null && !email.isBlank()) {
            String emailKey = "forgot:email:" + email.trim().toLowerCase();
            if (!tryAcquire(emailKey, 3, 600)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Đã gửi quá nhiều yêu cầu đặt lại mật khẩu cho tài khoản này. Vui lòng kiểm tra hòm thư hoặc thử lại sau 10 phút.");
            }
        }
    }

    /**
     * Giới hạn tần suất gửi OTP: Tối đa 5 lần trong 5 phút theo IP, 1 lần mỗi 60 giây theo Email (tối đa 3 lần/5 phút)
     */
    public void checkSendOtpRateLimit(String clientIp, String email) {
        String ipKey = "otp:ip:" + (clientIp != null ? clientIp : "unknown");
        if (!tryAcquire(ipKey, 6, 300)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Mạng của bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng thử lại sau 5 phút.");
        }

        if (email != null && !email.isBlank()) {
            String emailKey = "otp:email:" + email.trim().toLowerCase();
            if (!tryAcquire(emailKey, 3, 300)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn vừa yêu cầu mã OTP gần đây. Vui lòng kiểm tra hộp thư hoặc chờ ít phút trước khi gửi lại.");
            }
        }
    }
}
