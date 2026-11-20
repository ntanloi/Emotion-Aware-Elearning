package com.elearning.emotion.controller;

import com.elearning.emotion.dto.OrderDto;
import com.elearning.emotion.dto.PaymentTransactionDto;
import com.elearning.emotion.dto.PayoutRequestDto;
import com.elearning.emotion.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/finance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminFinanceController {

    private final OrderService orderService;

    // 0. Tổng quan Thống kê Tài chính
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(orderService.getAdminFinanceSummary());
    }

    // 1. Quản lý Đơn hàng
    @GetMapping("/orders")
    public ResponseEntity<Page<OrderDto>> getOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(orderService.getAdminOrders(status, q, pageable));
    }

    // 2. Đối soát Giao dịch ngân hàng SePay
    @GetMapping("/transactions")
    public ResponseEntity<Page<PaymentTransactionDto>> getTransactions(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(orderService.getPaymentTransactions(status, pageable));
    }

    @PostMapping("/transactions/{txId}/manual-match")
    public ResponseEntity<OrderDto> manualMatch(
            @AuthenticationPrincipal String adminId,
            @PathVariable String txId,
            @RequestBody Map<String, String> body) {
        String orderCode = body.get("orderCode");
        String adminNote = body.get("adminNote");
        return ResponseEntity.ok(orderService.manualMatchTransaction(adminId, txId, orderCode, adminNote));
    }

    // 3. Yêu cầu Rút tiền của Giảng viên
    @GetMapping("/payouts")
    public ResponseEntity<Page<PayoutRequestDto>> getPayouts(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(orderService.getAdminPayoutRequests(status, pageable));
    }

    @GetMapping("/payouts/{payoutId}/check-sepay")
    public ResponseEntity<com.elearning.emotion.dto.SepayPayoutCheckResult> checkPayoutSepay(
            @PathVariable String payoutId,
            @RequestParam(required = false) String transactionRef) {
        return ResponseEntity.ok(orderService.checkPayoutSepay(payoutId, transactionRef));
    }

    @PostMapping("/payouts/{payoutId}/approve")
    public ResponseEntity<PayoutRequestDto> approvePayout(
            @AuthenticationPrincipal String adminId,
            @PathVariable String payoutId,
            @RequestBody Map<String, String> body) {
        String transactionRef = body.get("transactionRef");
        String adminNote = body.get("adminNote");
        return ResponseEntity.ok(orderService.approvePayout(adminId, payoutId, transactionRef, adminNote));
    }

    @PostMapping("/payouts/{payoutId}/reject")
    public ResponseEntity<PayoutRequestDto> rejectPayout(
            @AuthenticationPrincipal String adminId,
            @PathVariable String payoutId,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        return ResponseEntity.ok(orderService.rejectPayout(adminId, payoutId, reason));
    }
}
