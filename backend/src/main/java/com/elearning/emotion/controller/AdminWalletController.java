package com.elearning.emotion.controller;

import com.elearning.emotion.dto.AdjustBalanceRequest;
import com.elearning.emotion.dto.ManualTopupRequest;
import com.elearning.emotion.dto.WalletEntryDto;
import com.elearning.emotion.dto.WalletWithdrawalDto;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.entity.WalletEntry;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.repository.WalletWithdrawalRepository;
import com.elearning.emotion.service.AuditService;
import com.elearning.emotion.service.NotificationService;
import com.elearning.emotion.service.StudentWalletService;
import com.elearning.emotion.service.WalletTopupService;
import com.elearning.emotion.service.WalletWithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/wallet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminWalletController {

    private final WalletTopupService topupService;
    private final StudentWalletService walletService;
    private final WalletWithdrawalService withdrawalService;
    private final WalletWithdrawalRepository withdrawalRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final com.elearning.emotion.service.WalletReconciliationService reconciliationService;
    private final com.elearning.emotion.repository.RewardEscrowRepository rewardEscrowRepository;
    private final com.elearning.emotion.config.RewardProperties rewardProperties;

    @PostMapping("/topup-manual")
    public ResponseEntity<Map<String, Object>> manualTopup(
            @AuthenticationPrincipal String adminId,
            @Valid @RequestBody ManualTopupRequest req
    ) {
        topupService.manualTopup(adminId, req.transactionId(), req.userId(), req.note());
        return ResponseEntity.ok(Map.of("success", true, "message", "Khớp nạp ví thủ công thành công"));
    }

    @PostMapping("/adjust")
    public ResponseEntity<WalletEntryDto> adjustBalance(
            @AuthenticationPrincipal String adminId,
            @Valid @RequestBody AdjustBalanceRequest req
    ) {
        WalletEntry entry = walletService.adjustBalance(req.userId(), req.bucket(), req.amount(), req.note());

        User admin = userRepository.findById(adminId).orElse(null);
        auditService.log(admin, "ADJUST_WALLET", "STUDENT_WALLET", req.userId(),
                "Điều chỉnh số dư ví (" + req.bucket() + ") số tiền: " + req.amount() + " đ. Lý do: " + req.note());

        String sign = req.amount().signum() >= 0 ? "+" : "";
        notificationService.send(
                req.userId(),
                "Điều chỉnh số dư ví",
                "Ví của bạn vừa được quản trị viên điều chỉnh " + sign + String.format("%,d", req.amount().longValue())
                        + " đ (" + req.bucket() + "). Lý do: " + req.note(),
                "WALLET",
                entry.getId(),
                "/wallet"
        );

        return ResponseEntity.ok(WalletEntryDto.from(entry));
    }

    @GetMapping("/withdrawals")
    public ResponseEntity<Page<WalletWithdrawalDto>> listWithdrawals(
            @RequestParam(required = false, defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<WalletWithdrawalDto> withdrawals = withdrawalRepository.findByStatusOrderByCreatedAtAsc(status, pageable)
                .map(WalletWithdrawalDto::from);
        return ResponseEntity.ok(withdrawals);
    }

    @PostMapping("/withdrawals/{id}/pay")
    public ResponseEntity<Map<String, Object>> markPaid(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        String transactionRef = body.get("transactionRef");
        withdrawalService.markPaid(adminId, id, transactionRef);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xác nhận chuyển tiền rút ví thành công"));
    }

    @PostMapping("/withdrawals/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        String note = body.get("note");
        withdrawalService.reject(adminId, id, note);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã từ chối và hoàn tiền về ví cho học viên"));
    }

    @GetMapping("/reconcile")
    public ResponseEntity<List<com.elearning.emotion.service.WalletReconciliationService.Discrepancy>> getReconciliationReport() {
        return ResponseEntity.ok(reconciliationService.runReconciliation());
    }

    @PostMapping("/reconcile")
    public ResponseEntity<List<com.elearning.emotion.service.WalletReconciliationService.Discrepancy>> triggerReconciliation() {
        return ResponseEntity.ok(reconciliationService.runReconciliation());
    }

    @GetMapping("/escrows")
    public ResponseEntity<Map<String, Object>> listEscrows(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<com.elearning.emotion.entity.RewardEscrow> escrows = (status != null && !status.isBlank())
                ? rewardEscrowRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : rewardEscrowRepository.findAll(pageable);
        return ResponseEntity.ok(Map.of(
                "escrows", escrows,
                "totalHolding", rewardEscrowRepository.sumTotalHolding()
        ));
    }

    @GetMapping("/reward-config")
    public ResponseEntity<com.elearning.emotion.config.RewardProperties> getRewardConfig() {
        return ResponseEntity.ok(rewardProperties);
    }
}
