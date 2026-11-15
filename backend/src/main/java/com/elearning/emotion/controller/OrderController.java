package com.elearning.emotion.controller;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.dto.OrderDto;
import com.elearning.emotion.dto.SepayWebhookPayload;
import com.elearning.emotion.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final PaymentProperties paymentProperties;
    private final com.elearning.emotion.service.WalletPurchaseService walletPurchaseService;

    @PostMapping("/wallet-purchase")
    public ResponseEntity<OrderDto> walletPurchase(
            @AuthenticationPrincipal String userId,
            @jakarta.validation.Valid @RequestBody com.elearning.emotion.dto.WalletPurchaseRequest request) {
        return ResponseEntity.ok(walletPurchaseService.purchase(
                userId,
                request.courseId(),
                Boolean.TRUE.equals(request.acceptRewardTerms())
        ));
    }

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @AuthenticationPrincipal String userId,
            @RequestBody Map<String, String> request) {
        String courseId = request.get("courseId");
        if (courseId == null || courseId.isBlank()) {
            throw new IllegalArgumentException("courseId không được để trống");
        }
        return ResponseEntity.ok(orderService.createOrder(userId, courseId));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDto> getOrder(
            @AuthenticationPrincipal String userId,
            @PathVariable String orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId, userId));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<OrderDto>> getMyOrders(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(orderService.getMyOrders(userId));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderDto> cancelOrder(
            @AuthenticationPrincipal String userId,
            @PathVariable String orderId) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId, userId));
    }

    /**
     * Webhook tiếp nhận biến động số dư tự động từ SePay.
     * B3: Kiểm tra API Key bằng so sánh hằng thời gian (constant-time). Sai trả về 401.
     * H1: Đẩy sang OrderService để ghi giao dịch, so khớp và kích hoạt ví giảng viên (Escrow).
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Api-Key", required = false) String xApiKey,
            @RequestBody SepayWebhookPayload payload) {

        // 1. Kiểm tra khóa API do SePay gửi kèm bằng so sánh hằng thời gian (fail-closed)
        String expectedKey = paymentProperties.getSepayApiKey();
        if (expectedKey == null || expectedKey.isBlank()) {
            log.error("SePay webhook rejected: sepayApiKey is not configured (fail-closed)!");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "error", "Cổng thanh toán chưa được cấu hình khóa API bảo mật"));
        }

        String incomingKey = null;
        if (authHeader != null && !authHeader.isBlank()) {
            if (authHeader.regionMatches(true, 0, "Apikey ", 0, 7)) {
                incomingKey = authHeader.substring(7).trim();
            } else if (authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
                incomingKey = authHeader.substring(7).trim();
            } else {
                incomingKey = authHeader.trim();
            }
        } else if (xApiKey != null && !xApiKey.isBlank()) {
            incomingKey = xApiKey.trim();
        }

        boolean valid = incomingKey != null && MessageDigest.isEqual(
                incomingKey.getBytes(StandardCharsets.UTF_8),
                expectedKey.getBytes(StandardCharsets.UTF_8)
        );

        if (!valid) {
            log.warn("Unauthorized SePay webhook request attempt! Invalid or missing API key.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "error", "Unauthorized: Khóa API webhook không hợp lệ"));
        }

        Map<String, Object> result = orderService.processSepayWebhook(payload, null);
        return ResponseEntity.ok(result);
    }
}
