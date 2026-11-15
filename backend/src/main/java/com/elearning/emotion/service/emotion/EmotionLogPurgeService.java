package com.elearning.emotion.service.emotion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Dọn dẹp dữ liệu log thô định kỳ (Lớp 3 KLTN - Thay thế cho Partitioning).
 * Vì số liệu thống kê giảng viên và học viên đã được tổng hợp bền vững trong session_bucket_stats,
 * log thô chỉ cần lưu trữ trong 30 ngày để phục vụ kiểm tra và đánh giá mô hình AI.
 * Xóa theo từng lô (5.000 dòng/lô) vào ban đêm để tránh lock bảng MySQL và bảo vệ quyền riêng tư.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmotionLogPurgeService {

    private final JdbcTemplate jdbcTemplate;
    private final SessionSlidingWindowCache slidingWindowCache;

    @Scheduled(cron = "0 30 3 * * *")
    public void purgeOldLogs() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(30);
        log.info("[EmotionLogPurge] Bắt đầu dọn dẹp emotion_logs cũ hơn 30 ngày (trước {})...", threshold);

        int totalDeleted = 0;
        int deletedInBatch;
        do {
            try {
                deletedInBatch = jdbcTemplate.update(
                        "DELETE FROM emotion_logs WHERE captured_at < ? LIMIT 5000",
                        threshold
                );
                totalDeleted += deletedInBatch;
                if (deletedInBatch > 0) {
                    Thread.sleep(50); // Nhường tài nguyên I/O cho các tác vụ khác
                }
            } catch (Exception ex) {
                log.error("[EmotionLogPurge] Lỗi khi xóa lô log thô: {}", ex.getMessage());
                break;
            }
        } while (deletedInBatch == 5000);

        log.info("[EmotionLogPurge] Hoàn tất dọn dẹp: Đã xóa {} bản ghi log thô cũ.", totalDeleted);

        // Dọn dẹp luôn các session không hoạt động trong RAM cache
        slidingWindowCache.cleanupIdleSessions();
    }
}
