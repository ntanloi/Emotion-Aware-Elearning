package com.elearning.emotion.service.live;

import com.elearning.emotion.dto.live.LiveAlertEventDto;
import com.elearning.emotion.entity.LessonAlert;
import com.elearning.emotion.event.LessonAlertCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class LiveAlertEventListener {

    private final LiveStreamRegistry liveStreamRegistry;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLessonAlertCreated(LessonAlertCreatedEvent event) {
        if (event == null || event.alert() == null || event.teacherId() == null) {
            return;
        }

        try {
            LessonAlert alert = event.alert();
            LiveAlertEventDto dto = new LiveAlertEventDto(
                    alert.getId(),
                    alert.getContentItem() != null ? alert.getContentItem().getId() : null,
                    event.lessonTitle(),
                    alert.getStartSec(),
                    alert.getEndSec(),
                    alert.getNegativeRatio() != null ? alert.getNegativeRatio().doubleValue() : 0.0,
                    alert.getNStudents()
            );

            liveStreamRegistry.broadcastAlert(event.teacherId(), dto);
            log.info("[LiveAlertEventListener] Đã broadcast cảnh báo điểm nghẽn bài '{}' ({}-{}s) tới giảng viên {}",
                    event.lessonTitle(), alert.getStartSec(), alert.getEndSec(), event.teacherId());
        } catch (Exception ex) {
            log.error("[LiveAlertEventListener] Lỗi khi broadcast cảnh báo SSE: {}", ex.getMessage());
        }
    }
}
