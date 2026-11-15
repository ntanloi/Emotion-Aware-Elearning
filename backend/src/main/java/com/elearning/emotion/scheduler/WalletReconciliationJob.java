package com.elearning.emotion.scheduler;

import com.elearning.emotion.service.WalletReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WalletReconciliationJob {

    private final WalletReconciliationService reconciliationService;

    /**
     * Chạy đối soát hằng đêm lúc 04:00 AM (giờ Việt Nam).
     */
    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runNightlyReconciliation() {
        log.info("[WalletReconciliationJob] Bắt đầu đối soát sổ cái hằng đêm...");
        try {
            var discrepancies = reconciliationService.runReconciliation();
            log.info("[WalletReconciliationJob] Kết thúc đối soát. Số vi phạm: {}", discrepancies.size());
        } catch (Exception ex) {
            log.error("[WalletReconciliationJob] Quá trình đối soát hằng đêm gặp lỗi: {}", ex.getMessage(), ex);
        }
    }
}
