package com.elearning.emotion.service.report;

import com.elearning.emotion.event.SessionFinishedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SessionFinishedEventListener — Giai đoạn 6 (Event-driven Report Generator).
 * Nhận sự kiện hoàn thành phiên học, chờ 5s để các bản ghi cảm xúc cuối cùng kịp flush vào DB,
 * sau đó tự động tái tính toán Báo cáo hàng ngày cho học viên mà không cần chờ Cron 23:55.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionFinishedEventListener {

    private final DailyReportGeneratorService dailyReportGeneratorService;

    // Tránh tính toán trùng lặp khi người dùng bấm finish nhiều lần
    private final Map<String, Long> lastDebounceMap = new ConcurrentHashMap<>();

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionFinished(SessionFinishedEvent event) {
        if (event == null || event.userId() == null || event.date() == null) {
            return;
        }

        String key = event.userId() + ":" + event.date();
        long now = System.currentTimeMillis();
        lastDebounceMap.put(key, now);

        try {
            // Chờ 5 giây gom tải và chờ EmotionLogWriter flush batch cuối
            Thread.sleep(5000);

            // Kiểm tra xem có phiên nào kết thúc sau phiên này không
            Long latest = lastDebounceMap.get(key);
            if (latest != null && latest > now) {
                // Đã có phiên kết thúc mới hơn, phiên đó sẽ chịu trách nhiệm tổng hợp
                return;
            }

            dailyReportGeneratorService.generateDailyReportForUser(event.userId(), event.date());
            log.info("[SessionFinishedEventListener] Đã cập nhật xong Báo cáo ngày {} cho học viên {}",
                    event.date(), event.userId());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.error("[SessionFinishedEventListener] Lỗi cập nhật báo cáo tự động: {}", ex.getMessage());
        } finally {
            lastDebounceMap.remove(key, now);
        }
    }
}
