package com.elearning.emotion.service.realtime;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * RealtimeEventListener — Lắng nghe sự kiện nghiệp vụ và dispatch tới RealtimeHub sau khi Transaction commit.
 * Thuộc tính fallbackExecution = true đảm bảo sự kiện vẫn được phát ngay cả khi publisher được gọi bên ngoài transaction.
 *
 * QUAN TRỌNG: việc ghi SSE xuống từng kết nối (có thể chậm/treo khi client đã rớt mạng sau proxy Render)
 * được chạy trên thread RIÊNG. Trước đây dispatch chạy ĐỒNG BỘ trên thread của request HTTP nên một kết nối SSE
 * treo sẽ làm request lưu đánh giá không bao giờ trả về -> modal "Đang lưu..." mãi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeEventListener {

    private final RealtimeHub realtimeHub;

    private final AtomicInteger threadSeq = new AtomicInteger();
    private final ThreadPoolExecutor dispatchExecutor = new ThreadPoolExecutor(
            2, 4, 60, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(500),
            r -> {
                Thread t = new Thread(r, "realtime-dispatch-" + threadSeq.incrementAndGet());
                t.setDaemon(true);
                return t;
            },
            // Hàng đợi đầy: bỏ sự kiện cũ nhất thay vì chặn request nghiệp vụ
            new ThreadPoolExecutor.DiscardOldestPolicy());

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRealtimeAppEvent(RealtimeAppEvent appEvent) {
        if (appEvent == null || appEvent.getRealtimeEvent() == null) return;
        RealtimeEvent event = appEvent.getRealtimeEvent();
        try {
            dispatchExecutor.execute(() -> {
                try {
                    realtimeHub.dispatch(event);
                } catch (Exception ex) {
                    log.error("[RealtimeEventListener] Lỗi khi dispatch sự kiện {}: {}", event.type(), ex.getMessage());
                }
            });
        } catch (Exception ex) {
            log.error("[RealtimeEventListener] Không thể xếp hàng sự kiện {}: {}", event.type(), ex.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        dispatchExecutor.shutdownNow();
    }
}
