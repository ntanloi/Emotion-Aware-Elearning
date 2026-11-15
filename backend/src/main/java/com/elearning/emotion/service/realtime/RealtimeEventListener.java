package com.elearning.emotion.service.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * RealtimeEventListener — Lắng nghe sự kiện nghiệp vụ và dispatch tới RealtimeHub sau khi Transaction commit.
 * Thuộc tính fallbackExecution = true đảm bảo sự kiện vẫn được phát ngay cả khi publisher được gọi bên ngoài transaction.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeEventListener {

    private final RealtimeHub realtimeHub;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRealtimeAppEvent(RealtimeAppEvent appEvent) {
        if (appEvent == null || appEvent.getRealtimeEvent() == null) return;
        try {
            realtimeHub.dispatch(appEvent.getRealtimeEvent());
        } catch (Exception ex) {
            log.error("[RealtimeEventListener] Lỗi khi dispatch sự kiện {}: {}",
                    appEvent.getRealtimeEvent().type(), ex.getMessage());
        }
    }
}
