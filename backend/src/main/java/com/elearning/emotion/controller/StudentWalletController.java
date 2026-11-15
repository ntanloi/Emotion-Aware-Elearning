package com.elearning.emotion.controller;

import com.elearning.emotion.dto.WalletDto;
import com.elearning.emotion.dto.WalletEntryDto;
import com.elearning.emotion.dto.WalletWithdrawalDto;
import com.elearning.emotion.dto.WithdrawalRequest;
import com.elearning.emotion.entity.StudentWallet;
import com.elearning.emotion.entity.WalletWithdrawal;
import com.elearning.emotion.repository.WalletEntryRepository;
import com.elearning.emotion.repository.WalletWithdrawalRepository;
import com.elearning.emotion.service.OrderService;
import com.elearning.emotion.service.StudentWalletService;
import com.elearning.emotion.service.WalletWithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/me/wallet")
@RequiredArgsConstructor
public class StudentWalletController {

    private final StudentWalletService walletService;
    private final WalletWithdrawalService withdrawalService;
    private final WalletEntryRepository entryRepository;
    private final WalletWithdrawalRepository withdrawalRepository;
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<WalletDto> getWallet(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) BigDecimal amount
    ) {
        StudentWallet wallet = walletService.getOrCreate(userId);
        var withdrawable = walletService.withdrawable(wallet);
        var bankInfo = orderService.getPlatformBankInfo();
        String qrUrl = orderService.generatePlatformVietQrUrl(wallet.getTopupCode(), amount);

        BigDecimal total = wallet.getCashBalance().add(wallet.getBonusBalance());

        WalletDto dto = new WalletDto(
                wallet.getCashBalance(),
                wallet.getBonusBalance(),
                total,
                wallet.getTopupCode(),
                qrUrl,
                bankInfo.bankId(),
                bankInfo.bankId(), // bankName fallback
                bankInfo.accountNo(),
                bankInfo.accountName(),
                withdrawable.total(),
                withdrawable.lockedCash(),
                withdrawable.nextUnlockAt()
        );
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/entries")
    public ResponseEntity<Page<WalletEntryDto>> getEntries(
            @AuthenticationPrincipal String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<WalletEntryDto> entries = entryRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(WalletEntryDto::from);
        return ResponseEntity.ok(entries);
    }

    @PostMapping("/withdrawals")
    public ResponseEntity<WalletWithdrawalDto> requestWithdrawal(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody WithdrawalRequest req
    ) {
        WalletWithdrawal wd = withdrawalService.request(
                userId,
                req.amount(),
                new WalletWithdrawalService.BankInfo(req.bankId(), req.accountNo(), req.accountName())
        );
        return ResponseEntity.ok(WalletWithdrawalDto.from(wd));
    }

    @GetMapping("/withdrawals")
    public ResponseEntity<List<WalletWithdrawalDto>> listWithdrawals(
            @AuthenticationPrincipal String userId
    ) {
        List<WalletWithdrawalDto> list = withdrawalRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(WalletWithdrawalDto::from)
                .toList();
        return ResponseEntity.ok(list);
    }
}
