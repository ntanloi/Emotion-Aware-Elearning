package com.elearning.emotion.controller;

import com.elearning.emotion.dto.PayoutRequestDto;
import com.elearning.emotion.dto.TeacherEscrowDto;
import com.elearning.emotion.dto.TeacherWalletEntryDto;
import com.elearning.emotion.dto.TeacherWalletSummaryDto;
import com.elearning.emotion.service.TeacherWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/wallet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherWalletController {

    private final TeacherWalletService walletService;

    @GetMapping("/summary")
    public ResponseEntity<TeacherWalletSummaryDto> getSummary(@AuthenticationPrincipal String teacherId) {
        return ResponseEntity.ok(walletService.getWalletSummary(teacherId));
    }

    @GetMapping("/entries")
    public ResponseEntity<Page<TeacherWalletEntryDto>> getEntries(
            @AuthenticationPrincipal String teacherId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(walletService.getWalletEntries(teacherId, pageable));
    }

    @GetMapping("/payout-requests")
    public ResponseEntity<List<PayoutRequestDto>> getMyPayoutRequests(@AuthenticationPrincipal String teacherId) {
        return ResponseEntity.ok(walletService.getMyPayoutRequests(teacherId));
    }

    @PostMapping("/payout-requests")
    public ResponseEntity<PayoutRequestDto> requestPayout(
            @AuthenticationPrincipal String teacherId,
            @RequestBody Map<String, BigDecimal> request) {
        BigDecimal amount = request.get("amount");
        return ResponseEntity.ok(walletService.requestPayout(teacherId, amount));
    }

    @GetMapping("/escrows")
    public ResponseEntity<Page<TeacherEscrowDto>> getEscrows(
            @AuthenticationPrincipal String teacherId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(walletService.getEscrows(teacherId, PageRequest.of(page, size)));
    }
}
