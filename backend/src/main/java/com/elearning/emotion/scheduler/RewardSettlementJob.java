package com.elearning.emotion.scheduler;

import com.elearning.emotion.repository.RewardEscrowRepository;
import com.elearning.emotion.repository.VideoViewAttemptRepository;
import com.elearning.emotion.service.RewardSettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RewardSettlementJob {

    private final RewardEscrowRepository escrowRepo;
    private final VideoViewAttemptRepository attemptRepo;
    private final RewardSettlementService settlement;

    /**
     * 6.3 Job hằng đêm: 03:15 AM quyết toán các escrow đã hết hạn giữ holdingUntil.
     */
    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Ho_Chi_Minh")
    public void settleExpired() {
        log.info("[RewardSettlementJob] Bắt đầu quét các escrow hết hạn giữ...");
        List<String> expiredIds = escrowRepo.findExpiredHoldingIds(LocalDateTime.now());
        for (String id : expiredIds) {
            try {
                settlement.settleIfExpired(id);
            } catch (Exception ex) {
                log.error("[RewardSettlementJob] Quyết toán escrow {} lỗi", id, ex);
            }
        }
    }

    /**
     * Job nhẹ mỗi giờ: quét các escrow HOLDING để xét thưởng nếu học viên đã đạt mà listener bị sót.
     */
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void retryHoldingEvaluations() {
        try {
            List<String> holdingIds = escrowRepo.findHoldingIdsForAnyHolding();
            for (String id : holdingIds) {
                try {
                    settlement.evaluate(id);
                } catch (Exception ex) {
                    log.error("[RewardSettlementJob] Retry evaluate escrow {} lỗi", id, ex);
                }
            }
        } catch (Exception ex) {
            log.warn("[RewardSettlementJob] Lỗi quét holding escrows: {}", ex.getMessage());
        }
    }

    /**
     * 6.5 Dọn dẹp quyền riêng tư: 03:30 AM xóa các lượt xem đã chốt quá 90 ngày không còn escrow HOLDING nào dùng.
     */
    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void purgeOldAttempts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        try {
            int purged = attemptRepo.purgeSettledAttempts(cutoff);
            if (purged > 0) {
                log.info("[RewardSettlementJob] Đã xóa {} lượt xem cũ quá 90 ngày.", purged);
            }
        } catch (Exception ex) {
            log.error("[RewardSettlementJob] Lỗi dọn dẹp lượt xem cũ: {}", ex.getMessage());
        }
    }
}
