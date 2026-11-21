package com.elearning.emotion.service.emotion;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Ghi log cảm xúc theo hàng đợi và theo lô (Async Batch Writer - Lớp 2 KLTN).
 * Giúp tách rời luồng thời gian thực của học viên khỏi luồng ghi Database:
 *  - Học viên không bao giờ bị chặn/chậm bởi DB.
 *  - Hàng đợi giới hạn 20.000 phần tử có cơ chế Shed Load khi quá tải.
 *  - Flush mỗi 1 giây gom 500 bản ghi thực hiện Batch Insert vào emotion_logs.
 *  - Đồng thời cập nhật bảng tổng hợp session_bucket_stats (ON DUPLICATE KEY UPDATE)
 *    và sắp xếp theo khóa để tránh Deadlock trong MySQL InnoDB.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmotionLogWriter {

    public record EmotionLogRow(
            String id,
            String sessionId,
            String contentItemId,
            String userId,
            String modelId,
            LocalDateTime capturedAt,
            String emotionLabel,
            String learningState,
            Float confidenceScore,
            Float videoTimeSec
    ) {}

    private final JdbcTemplate jdbcTemplate;
    private final org.springframework.beans.factory.ObjectProvider<com.elearning.emotion.service.SegmentAlertService> segmentAlertServiceProvider;
    private final BlockingQueue<EmotionLogRow> queue = new LinkedBlockingQueue<>(20_000);
    private final org.springframework.beans.factory.ObjectProvider<com.elearning.emotion.service.realtime.RealtimePublisher> realtimePublisherProvider;

    /** Các bài giảng có số liệu cảm xúc mới, chờ gộp rồi phát sự kiện realtime cho giảng viên (tránh spam mỗi giây) */
    private final Set<String> dirtyStatItems = java.util.concurrent.ConcurrentHashMap.newKeySet();
    /** Cache contentItemId -> teacherId để không phải truy vấn DB lặp lại */
    private final Map<String, String> teacherByItem = new java.util.concurrent.ConcurrentHashMap<>();

    public void enqueue(EmotionLogRow row) {
        if (!queue.offer(row)) {
            log.warn("[EmotionLogWriter] Hàng đợi log cảm xúc đầy (20,000), bỏ qua 1 mẫu để bảo vệ hệ thống!");
        }
    }

    /**
     * Xả toàn bộ hàng đợi hiện có xuống DB (dùng khi kết thúc phiên học để điểm tập trung được chốt
     * sau khi các mẫu cuối đã vào session_bucket_stats). synchronized để chờ lượt flush đang chạy dở.
     */
    public synchronized void flushAll() {
        do {
            flush();
        } while (!queue.isEmpty());
    }

    @Scheduled(fixedDelay = 1000)
    public synchronized void flush() {
        List<EmotionLogRow> batch = new ArrayList<>(500);
        queue.drainTo(batch, 500);
        if (batch.isEmpty()) {
            return;
        }

        try {
            // 1. Ghi lô vào emotion_logs
            jdbcTemplate.batchUpdate("""
                INSERT INTO emotion_logs (id, session_id, model_id, captured_at, emotion_label,
                                          learning_state, confidence_score, video_time_sec)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                batch,
                500,
                (ps, r) -> {
                    ps.setString(1, r.id());
                    ps.setString(2, r.sessionId());
                    ps.setString(3, r.modelId());
                    ps.setTimestamp(4, Timestamp.valueOf(r.capturedAt() != null ? r.capturedAt() : LocalDateTime.now()));
                    ps.setString(5, r.emotionLabel() != null ? r.emotionLabel() : "neutral");
                    ps.setString(6, r.learningState() != null ? r.learningState() : "ENGAGED");
                    if (r.confidenceScore() != null) ps.setFloat(7, r.confidenceScore()); else ps.setNull(7, java.sql.Types.FLOAT);
                    if (r.videoTimeSec() != null) ps.setFloat(8, r.videoTimeSec()); else ps.setNull(8, java.sql.Types.FLOAT);
                }
            );

            // 2. Gom nhóm theo (sessionId, bucketIndex) để Upsert vào session_bucket_stats
            record BucketKey(String sessionId, int bucketIndex) implements Comparable<BucketKey> {
                @Override
                public int compareTo(BucketKey o) {
                    int c = this.sessionId.compareTo(o.sessionId);
                    return c != 0 ? c : Integer.compare(this.bucketIndex, o.bucketIndex);
                }
            }

            class BucketCounter {
                String contentItemId;
                String userId;
                int nTotal = 0, nEngaged = 0, nInterested = 0, nNeutral = 0, nConfused = 0, nBored = 0, nNoFace = 0;
            }

            Map<BucketKey, BucketCounter> map = new HashMap<>();
            for (EmotionLogRow r : batch) {
                if (r.videoTimeSec() == null || r.contentItemId() == null || r.userId() == null) continue;
                int bucketIndex = (int) Math.floor(r.videoTimeSec() / 10.0f);
                BucketKey key = new BucketKey(r.sessionId(), bucketIndex);
                BucketCounter counter = map.computeIfAbsent(key, k -> {
                    BucketCounter c = new BucketCounter();
                    c.contentItemId = r.contentItemId();
                    c.userId = r.userId();
                    return c;
                });
                counter.nTotal++;
                String st = r.learningState() != null ? r.learningState().toUpperCase() : "ENGAGED";
                switch (st) {
                    case "ENGAGED" -> counter.nEngaged++;
                    case "INTERESTED" -> counter.nInterested++;
                    case "NEUTRAL" -> counter.nNeutral++;
                    case "CONFUSED" -> counter.nConfused++;
                    case "BORED" -> counter.nBored++;
                    case "NO_FACE" -> counter.nNoFace++;
                    default -> counter.nEngaged++;
                }
            }

            if (!map.isEmpty()) {
                // Sắp xếp entries theo BucketKey để tránh deadlock trong MySQL InnoDB
                List<Map.Entry<BucketKey, BucketCounter>> sortedEntries = new ArrayList<>(map.entrySet());
                sortedEntries.sort(Map.Entry.comparingByKey());

                jdbcTemplate.batchUpdate("""
                    INSERT INTO session_bucket_stats (session_id, bucket_index, content_item_id, user_id,
                                                      n_total, n_engaged, n_interested, n_neutral,
                                                      n_confused, n_bored, n_noface)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        n_total = n_total + VALUES(n_total),
                        n_engaged = n_engaged + VALUES(n_engaged),
                        n_interested = n_interested + VALUES(n_interested),
                        n_neutral = n_neutral + VALUES(n_neutral),
                        n_confused = n_confused + VALUES(n_confused),
                        n_bored = n_bored + VALUES(n_bored),
                        n_noface = n_noface + VALUES(n_noface)
                    """,
                    sortedEntries,
                    sortedEntries.size(),
                    (ps, entry) -> {
                        BucketKey k = entry.getKey();
                        BucketCounter c = entry.getValue();
                        ps.setString(1, k.sessionId());
                        ps.setInt(2, k.bucketIndex());
                        ps.setString(3, c.contentItemId);
                        ps.setString(4, c.userId);
                        ps.setInt(5, c.nTotal);
                        ps.setInt(6, c.nEngaged);
                        ps.setInt(7, c.nInterested);
                        ps.setInt(8, c.nNeutral);
                        ps.setInt(9, c.nConfused);
                        ps.setInt(10, c.nBored);
                        ps.setInt(11, c.nNoFace);
                    }
                );

                // Đánh dấu bài giảng có số liệu mới để đẩy realtime lên Dashboard giảng viên
                for (BucketCounter c : map.values()) {
                    if (c.contentItemId != null) {
                        dirtyStatItems.add(c.contentItemId);
                    }
                }

                // Giai đoạn 5: Đánh dấu các contentItemId dirty để SegmentAlertService quét lại
                var alertService = segmentAlertServiceProvider.getIfAvailable();
                if (alertService != null) {
                    for (BucketCounter c : map.values()) {
                        if (c.contentItemId != null) {
                            alertService.markDirty(c.contentItemId);
                        }
                    }
                }
            }

        } catch (Exception ex) {
            log.error("[EmotionLogWriter] Lỗi khi ghi lô vào Database: {}", ex.getMessage(), ex);
        }
    }

    /** Cho phép service khác (vd: bắt đầu/kết thúc phiên học) báo bài giảng có thay đổi thống kê. */
    public void markStatsDirty(String contentItemId) {
        if (contentItemId != null) {
            dirtyStatItems.add(contentItemId);
        }
    }

    /**
     * Mỗi 3 giây gộp các bài giảng có số liệu mới và phát sự kiện SSE "emotion-stats" tới đúng giảng viên
     * sở hữu khóa học, để bảng "Hiệu quả Cảm xúc theo từng Bài giảng Video" cập nhật realtime.
     */
    @Scheduled(fixedDelay = 3000)
    public void publishStatsChanged() {
        if (dirtyStatItems.isEmpty()) return;
        var publisher = realtimePublisherProvider.getIfAvailable();
        List<String> ids = new ArrayList<>(dirtyStatItems);
        dirtyStatItems.removeAll(ids);
        if (publisher == null) return;

        Map<String, List<String>> itemsByTeacher = new HashMap<>();
        for (String itemId : ids) {
            try {
                String teacherId = teacherByItem.get(itemId);
                if (teacherId == null) {
                    List<String> rows = jdbcTemplate.queryForList(
                            "SELECT co.teacher_id FROM content_items ci JOIN courses co ON ci.course_id = co.id WHERE ci.id = ?",
                            String.class, itemId);
                    if (rows.isEmpty()) continue;
                    teacherId = rows.get(0);
                    teacherByItem.put(itemId, teacherId);
                }
                itemsByTeacher.computeIfAbsent(teacherId, k -> new ArrayList<>()).add(itemId);
            } catch (Exception ex) {
                log.warn("[EmotionLogWriter] Không xác định được giảng viên của bài {}: {}", itemId, ex.getMessage());
            }
        }
        itemsByTeacher.forEach((teacherId, items) ->
                publisher.publishToUser(teacherId, "emotion-stats", Map.of("contentItemIds", items)));
    }

    @PreDestroy
    public void drain() {
        log.info("[EmotionLogWriter] Đang xả toàn bộ hàng đợi trước khi tắt server ({} bản ghi)...", queue.size());
        while (!queue.isEmpty()) {
            flush();
        }
    }
}