package com.elearning.emotion.scheduler;

import com.elearning.emotion.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderExpirationScheduler {

    private final OrderService orderService;

    /**
     * H1: Định kỳ mỗi 5 phút quét và tự động chuyển các đơn hàng PENDING quá 24h sang EXPIRED.
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 15000)
    public void scanAndExpireOverdueOrders() {
        try {
            int expiredCount = orderService.expireOverdueOrders();
            if (expiredCount > 0) {
                log.info("[OrderExpirationScheduler] Đã hủy và đánh dấu hết hạn {} đơn hàng quá hạn.", expiredCount);
            }
        } catch (Exception ex) {
            log.error("[OrderExpirationScheduler] Lỗi khi quét đơn hàng hết hạn: {}", ex.getMessage());
        }
    }
}
