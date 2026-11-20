package com.elearning.emotion.service;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.dto.LessonAlertDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.LessonAlert;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.AdaptiveSuggestionRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.LessonAlertRepository;
import com.elearning.emotion.repository.SessionBucketStatsRepository;
import com.elearning.emotion.service.emotion.StudentEpisodeAnalyzer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SegmentAlertService {

    private final ContentItemRepository contentItemRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final LessonAlertRepository lessonAlertRepository;
    private final AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    private final NotificationService notificationService;
    private final EmotionAlertProperties alertProperties;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final StudentEpisodeAnalyzer studentEpisodeAnalyzer;
    private final PlatformTransactionManager txManager;

    private final Set<String> dirtyContentItemIds = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final Map<String, Integer> dirtyRetryCounts = new java.util.concurrent.ConcurrentHashMap<>();

    public void markDirty(String contentItemId) {
        if (contentItemId != null && !contentItemId.isBlank()) {
            dirtyContentItemIds.add(contentItemId);
        }
    }

    /**
     * Giai đoạn 5: Quét định kỳ mỗi 15 giây CHỈ cho các bài giảng có dữ liệu mới (dirty)
     * Mỗi bài được bọc trong một Transaction riêng biệt (TransactionTemplate) để lỗi một bài không làm rollback cả lô.
     * Giới hạn tối đa 3 lần thử lại cho mỗi bài để tránh lặp vô hạn khi gặp lỗi vĩnh viễn.
     */
    @Scheduled(fixedDelay = 15000, initialDelay = 15000)
    public void scanDirty() {
        if (dirtyContentItemIds.isEmpty()) return;

        Set<String> toProcess = new HashSet<>();
        Iterator<String> it = dirtyContentItemIds.iterator();
        while (it.hasNext()) {
            toProcess.add(it.next());
            it.remove();
        }

        TransactionTemplate tx = new TransactionTemplate(txManager);
        for (String cId : toProcess) {
            try {
                tx.executeWithoutResult(status ->
                        contentItemRepository.findById(cId).ifPresent(this::processItemAlerts)
                );
                dirtyRetryCounts.remove(cId); // Thành công -> reset số lần thử
            } catch (Exception ex) {
                int count = dirtyRetryCounts.getOrDefault(cId, 0) + 1;
                if (count < 3) {
                    dirtyRetryCounts.put(cId, count);
                    log.error("[SegmentAlertService] Lỗi scan dirty bài {} (lần thử {}/3): {}", cId, count, ex.getMessage(), ex);
                    markDirty(cId); // Thử lại ở lượt quét sau
                } else {
                    log.warn("[SegmentAlertService] Bài giảng {} lỗi liên tục 3 lần, tạm ngừng retry ở scanDirty (để lượt quét 5 phút xử lý)", cId);
                    dirtyRetryCounts.remove(cId);
                }
            }
        }
    }

    private static class BucketEval {
        int bucketIndex;
        int startSec;
        int endSec;
        long studentCount;
        double ratio;

        BucketEval(int bucketIndex, long studentCount, double ratio) {
            this.bucketIndex = bucketIndex;
            this.startSec = bucketIndex * 10;
            this.endSec = this.startSec + 10;
            this.studentCount = studentCount;
            this.ratio = ratio;
        }
    }

    /**
     * H2: Định kỳ 5 phút quét toàn bộ video bài giảng để phát hiện các đoạn học viên mất tập trung / bối rối.
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 30000)
    public void scheduledScan() {
        try {
            int newAlerts = scanAndGenerateAlerts();
            if (newAlerts > 0) {
                log.info("[SegmentAlertService] Đã quét và ghi nhận {} cảnh báo bài giảng mới.", newAlerts);
            }
        } catch (Exception ex) {
            log.error("[SegmentAlertService] Lỗi khi quét cảnh báo bài giảng: {}", ex.getMessage(), ex);
        }
    }

    public int scanAndGenerateAlerts() {
        List<String> ids = contentItemRepository.findByType("VIDEO_LECTURE")
                .stream().map(ContentItem::getId).toList();
        int createdAlertsCount = 0;
        TransactionTemplate tx = new TransactionTemplate(txManager);

        for (String id : ids) {
            try {
                Integer count = tx.execute(s ->
                        contentItemRepository.findById(id).map(this::processItemAlerts).orElse(0)
                );
                if (count != null) {
                    createdAlertsCount += count;
                }
            } catch (Exception e) {
                log.error("[SegmentAlertService] Lỗi khi xử lý bài giảng {}: {}", id, e.getMessage(), e);
            }
        }
        return createdAlertsCount;
    }

    @Transactional
    public int processItemAlerts(ContentItem item) {
        var rows = sessionBucketStatsRepository.findStudentBuckets(item.getId());
        if (rows.isEmpty()) return 0;

        var episodes = studentEpisodeAnalyzer.analyze(rows);

        int warmupSec = alertProperties.getIgnoreWarmupSeconds();
        int minStudents = alertProperties.getMinStudents();

        // 1. Số em đang xem mỗi bucket (đã qua warmup, đủ mẫu hợp lệ)
        Map<Integer, Set<String>> watching = new HashMap<>();
        for (var r : rows) {
            if (r.getBucketIndex() == null || r.getUserId() == null) continue;
            long total = r.getTotal() != null ? r.getTotal() : 0L;
            long noFace = r.getNoFace() != null ? r.getNoFace() : 0L;
            long valid = total - noFace;
            if (r.getBucketIndex() * 10 < warmupSec || valid < alertProperties.getMinValidSamplesPerBucket()) {
                continue;
            }
            watching.computeIfAbsent(r.getBucketIndex(), k -> new HashSet<>()).add(r.getUserId());
        }

        // 2. Số em có episode phủ bucket đó
        Map<Integer, Set<String>> affected = new HashMap<>();
        for (var ep : episodes) {
            for (int b = ep.startBucket(); b <= ep.endBucket(); b++) {
                if (watching.getOrDefault(b, Collections.emptySet()).contains(ep.userId())) {
                    affected.computeIfAbsent(b, k -> new HashSet<>()).add(ep.userId());
                }
            }
        }

        List<BucketEval> validBuckets = new ArrayList<>();
        for (var w : watching.entrySet()) {
            if (w.getValue().size() < minStudents) continue;
            int aff = affected.getOrDefault(w.getKey(), Collections.emptySet()).size();
            double ratio = (double) aff / w.getValue().size();
            validBuckets.add(new BucketEval(w.getKey(), w.getValue().size(), ratio));
        }
        validBuckets.sort(Comparator.comparingInt(b -> b.bucketIndex));

        if (validBuckets.size() < alertProperties.getMinConsecutiveBuckets()) return 0;

        // 3. Tính trung bình và độ lệch chuẩn của toàn bộ video
        double mean = validBuckets.stream().mapToDouble(b -> b.ratio).average().orElse(0.0);
        double variance = validBuckets.stream()
                .mapToDouble(b -> Math.pow(b.ratio - mean, 2))
                .average()
                .orElse(0.0);
        double stdDev = Math.sqrt(variance);

        // Ngưỡng phát hiện: Ít nhất 35% VÀ cao hơn trung bình + k * độ lệch chuẩn
        double threshold = Math.max(alertProperties.getNegativeRatioThreshold(), mean + alertProperties.getStdDevMultiplier() * stdDev);

        // 4. Đánh dấu các bucket vượt ngưỡng
        Set<Integer> flaggedIndexes = new HashSet<>();
        Map<Integer, BucketEval> evalMap = new HashMap<>();
        for (BucketEval b : validBuckets) {
            evalMap.put(b.bucketIndex, b);
            if (b.ratio >= threshold) {
                flaggedIndexes.add(b.bucketIndex);
            }
        }

        if (flaggedIndexes.isEmpty()) return 0;

        // 5. Gom các bucket liên tiếp thành phân đoạn (Consecutive Run)
        List<Integer> sortedIndexes = new ArrayList<>(flaggedIndexes);
        Collections.sort(sortedIndexes);

        List<List<Integer>> runs = new ArrayList<>();
        List<Integer> currentRun = new ArrayList<>();

        for (int idx : sortedIndexes) {
            if (currentRun.isEmpty()) {
                currentRun.add(idx);
            } else {
                int last = currentRun.get(currentRun.size() - 1);
                if (idx == last + 1) {
                    currentRun.add(idx);
                } else {
                    runs.add(new ArrayList<>(currentRun));
                    currentRun.clear();
                    currentRun.add(idx);
                }
            }
        }
        if (!currentRun.isEmpty()) {
            runs.add(currentRun);
        }

        int minConsecutive = alertProperties.getMinConsecutiveBuckets();
        int createdCount = 0;

        for (List<Integer> run : runs) {
            if (run.size() < minConsecutive) continue;

            int firstIdx = run.get(0);
            int lastIdx = run.get(run.size() - 1);

            int rawStartSec = firstIdx * 10;
            int endSec = (lastIdx + 1) * 10;
            int displayStartSec = Math.max(0, rawStartSec - alertProperties.getReactionLagSeconds());

            // Thu thập các episode chồng lên phân đoạn [firstIdx, lastIdx]
            List<StudentEpisodeAnalyzer.Episode> overlappingEpisodes = episodes.stream()
                    .filter(ep -> ep.startBucket() <= lastIdx && ep.endBucket() >= firstIdx)
                    .toList();

            Set<String> affectedUserIds = new HashSet<>();
            Set<String> recurringUserIds = new HashSet<>();
            Set<String> sustainedUserIds = new HashSet<>();
            long totalConfused = 0;
            long totalBored = 0;

            for (var ep : overlappingEpisodes) {
                affectedUserIds.add(ep.userId());
                if (ep.type() == StudentEpisodeAnalyzer.Type.RECURRING) {
                    recurringUserIds.add(ep.userId());
                } else {
                    sustainedUserIds.add(ep.userId());
                }
                totalConfused += ep.confused();
                totalBored += ep.bored();
            }

            Set<String> watchingUserIds = new HashSet<>();
            double sumRatio = 0;
            for (int idx : run) {
                Set<String> w = watching.get(idx);
                if (w != null) watchingUserIds.addAll(w);
                BucketEval be = evalMap.get(idx);
                if (be != null) sumRatio += be.ratio;
            }

            int nWatching = Math.max(watchingUserIds.size(), affectedUserIds.size());
            int nAffected = affectedUserIds.size();
            int nRecurring = recurringUserIds.size();
            int nSustained = sustainedUserIds.size();

            double avgRatio = Math.round((sumRatio / run.size()) * 1000.0) / 1000.0;
            BigDecimal negRatio = BigDecimal.valueOf(avgRatio).setScale(4, RoundingMode.HALF_UP);

            String dominantState = totalConfused >= totalBored ? "CONFUSED" : "BORED";

            // Tín hiệu tua lại (Step 6): Học viên xem lại/chấp nhận gợi ý tua lại tại đoạn này
            long acceptedRewinds = adaptiveSuggestionRepository != null
                    ? adaptiveSuggestionRepository.countAcceptedRewinds(item.getId(), displayStartSec, endSec)
                    : 0;

            // Phân mức ưu tiên (Severity):
            // HIGH khi tỉ lệ >= 50% hoặc z-score >= 2.5 hoặc (tỉ lệ >= 40% & có học sinh tua lại >= 2 lần)
            // MEDIUM khi >= 40% hoặc có học sinh tua lại >= 1 lần
            // còn lại LOW (tỉ lệ trong dải ngưỡng kích hoạt < 40% và không có tua lại)
            String severity = "LOW";
            double zScore = stdDev > 0 ? (avgRatio - mean) / stdDev : 0.0;
            if (avgRatio >= 0.50 || zScore >= 2.5 || (avgRatio >= 0.40 && acceptedRewinds >= 2)) {
                severity = "HIGH";
            } else if (avgRatio >= 0.40 || acceptedRewinds >= 1) {
                severity = "MEDIUM";
            }

            // 6. Upsert theo khoảng chồng lấn (Overlapping Upsert)
            List<LessonAlert> overlappingActive = lessonAlertRepository.findOverlappingActiveAlerts(
                    item.getId(), displayStartSec, endSec
            );

            List<LessonAlert> overlappingAll = lessonAlertRepository.findOverlappingAlerts(
                    item.getId(), displayStartSec, endSec
            );

            // Kiểm tra xem đoạn này có giao thoa đáng kể (>= 60%) với alert đã đóng (RESOLVED hoặc DISMISSED) không
            boolean alreadyClosed = overlappingAll.stream().anyMatch(a -> {
                if (!"RESOLVED".equals(a.getStatus()) && !"DISMISSED".equals(a.getStatus())) {
                    return false;
                }
                int aStart = a.getStartSec() != null ? a.getStartSec() : 0;
                int aEnd = a.getEndSec() != null ? a.getEndSec() : 0;
                int overlapStart = Math.max(displayStartSec, aStart);
                int overlapEnd = Math.min(endSec, aEnd);
                int overlapLen = Math.max(0, overlapEnd - overlapStart);
                int runLen = endSec - displayStartSec;
                return runLen > 0 && ((double) overlapLen / runLen >= 0.60);
            });
            if (alreadyClosed && overlappingActive.isEmpty()) {
                continue;
            }

            if (!overlappingActive.isEmpty()) {
                LessonAlert primary = overlappingActive.get(0);
                int mergedStart = Math.min(primary.getStartSec(), displayStartSec);
                int mergedEnd = Math.max(primary.getEndSec(), endSec);
                int mergedRawStart = Math.min(
                        primary.getRawStartSec() != null ? primary.getRawStartSec() : primary.getStartSec(),
                        rawStartSec
                );
                int mergedAffected = Math.max(primary.getAffectedStudents() != null ? primary.getAffectedStudents() : 0, nAffected);
                int mergedWatching = Math.max(primary.getNStudents() != null ? primary.getNStudents() : 0, nWatching);
                int mergedRecurring = Math.max(primary.getRecurringStudents() != null ? primary.getRecurringStudents() : 0, nRecurring);
                int mergedSustained = Math.max(primary.getSustainedStudents() != null ? primary.getSustainedStudents() : 0, nSustained);
                BigDecimal maxRatio = primary.getNegativeRatio() != null && primary.getNegativeRatio().compareTo(negRatio) > 0
                        ? primary.getNegativeRatio() : negRatio;
                String highestSeverity = pickHighestSeverity(primary.getSeverity(), severity);

                // Gộp tất cả các alert active bị chồng lấn và đóng các bản ghi phụ để tránh trùng lặp
                for (int k = 1; k < overlappingActive.size(); k++) {
                    LessonAlert other = overlappingActive.get(k);
                    mergedStart = Math.min(mergedStart, other.getStartSec());
                    mergedEnd = Math.max(mergedEnd, other.getEndSec());
                    if (other.getRawStartSec() != null) {
                        mergedRawStart = Math.min(mergedRawStart, other.getRawStartSec());
                    }
                    if (other.getAffectedStudents() != null) {
                        mergedAffected = Math.max(mergedAffected, other.getAffectedStudents());
                    }
                    if (other.getNStudents() != null) {
                        mergedWatching = Math.max(mergedWatching, other.getNStudents());
                    }
                    if (other.getRecurringStudents() != null) {
                        mergedRecurring = Math.max(mergedRecurring, other.getRecurringStudents());
                    }
                    if (other.getSustainedStudents() != null) {
                        mergedSustained = Math.max(mergedSustained, other.getSustainedStudents());
                    }
                    if (other.getNegativeRatio() != null && other.getNegativeRatio().compareTo(maxRatio) > 0) {
                        maxRatio = other.getNegativeRatio();
                    }
                    highestSeverity = pickHighestSeverity(highestSeverity, other.getSeverity());

                    // Đánh dấu alert phụ bị gộp là MERGED để tránh trùng lặp và không làm bẩn số liệu đánh giá
                    other.setStatus("MERGED");
                    lessonAlertRepository.save(other);
                }

                primary.setStartSec(mergedStart);
                primary.setEndSec(mergedEnd);
                primary.setRawStartSec(mergedRawStart);
                primary.setNegativeRatio(maxRatio);
                primary.setNStudents(mergedWatching);
                primary.setAffectedStudents(mergedAffected);
                primary.setRecurringStudents(mergedRecurring);
                primary.setSustainedStudents(mergedSustained);
                primary.setDominantState(dominantState);
                primary.setSeverity(highestSeverity);

                lessonAlertRepository.save(primary);
            } else {
                LessonAlert newAlert = LessonAlert.builder()
                        .contentItem(item)
                        .startSec(displayStartSec)
                        .endSec(endSec)
                        .rawStartSec(rawStartSec)
                        .negativeRatio(negRatio)
                        .nStudents(nWatching)
                        .affectedStudents(nAffected)
                        .recurringStudents(nRecurring)
                        .sustainedStudents(nSustained)
                        .dominantState(dominantState)
                        .severity(severity)
                        .status("OPEN")
                        .build();

                LessonAlert saved = lessonAlertRepository.save(newAlert);
                createdCount++;

                // 7. Gửi thông báo VIDEO_ALERT cho giảng viên
                sendTeacherNotification(item, saved);
            }
        }

        return createdCount;
    }

    private String pickHighestSeverity(String s1, String s2) {
        if ("HIGH".equalsIgnoreCase(s1) || "HIGH".equalsIgnoreCase(s2)) return "HIGH";
        if ("MEDIUM".equalsIgnoreCase(s1) || "MEDIUM".equalsIgnoreCase(s2)) return "MEDIUM";
        return "LOW";
    }

    private void sendTeacherNotification(ContentItem item, LessonAlert alert) {
        try {
            if (item.getCourse() == null || item.getCourse().getTeacher() == null) return;
            User teacher = item.getCourse().getTeacher();

            int s = alert.getStartSec();
            int e = alert.getEndSec();
            String timeLabel = String.format("%02d:%02d - %02d:%02d", s / 60, s % 60, e / 60, e % 60);

            int affected = alert.getAffectedStudents() != null ? alert.getAffectedStudents() : 0;
            int total = alert.getNStudents() != null ? alert.getNStudents() : 0;
            double pct = total > 0
                    ? Math.round(affected * 1000.0 / total) / 10.0
                    : (alert.getNegativeRatio() != null ? Math.round(alert.getNegativeRatio().doubleValue() * 1000.0) / 10.0 : 0.0);

            String stateVn = "CONFUSED".equalsIgnoreCase(alert.getDominantState()) ? "bối rối" : "mất tập trung";
            if (alert.getRecurringStudents() != null && alert.getRecurringStudents() > 0) {
                stateVn += " lặp lại";
            }

            String title = "⚠️ Cảnh báo bài giảng: Điểm nghẽn tiếp thu";
            String content = String.format("Bài '%s' có đoạn %s: %d/%d học viên (%.1f%%) %s.",
                    item.getTitle(), timeLabel, affected, total, pct, stateVn);
            String link = "/dashboard/teacher?tab=emotions&lessonId=" + item.getId() + "&time=" + s;

            notificationService.send(
                    teacher.getId(),
                    title,
                    content,
                    "VIDEO_ALERT",
                    alert.getId(),
                    link
            );
            log.info("Sent VIDEO_ALERT for lesson {} segment {} to teacher {}", item.getId(), timeLabel, teacher.getId());

            // Giai đoạn 5: Phát sự kiện sau commit để đẩy SSE alert tới giảng viên
            eventPublisher.publishEvent(new com.elearning.emotion.event.LessonAlertCreatedEvent(alert, teacher.getId(), item.getTitle()));
        } catch (Exception ex) {
            log.warn("Could not send alert notification: {}", ex.getMessage());
        }
    }

    private static final Set<String> TEACHER_UPDATABLE_STATUSES = Set.of("OPEN", "ACKED", "RESOLVED", "DISMISSED");
    private static final Set<String> VALID_ALERT_STATUSES = Set.of("OPEN", "ACKED", "RESOLVED", "DISMISSED", "MERGED");

    @Transactional(readOnly = true)
    public List<LessonAlertDto> getAlertsByTeacher(String teacherId, String status) {
        List<LessonAlert> alerts = (status != null && !status.isBlank())
                ? lessonAlertRepository.findByTeacherIdAndStatus(teacherId, status.toUpperCase())
                : lessonAlertRepository.findByTeacherId(teacherId);
        return alerts.stream()
                .filter(a -> !"MERGED".equalsIgnoreCase(a.getStatus()))
                .map(LessonAlertDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LessonAlertDto> getAlertsByLesson(String teacherId, String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài giảng"));
        if (item.getCourse() != null && item.getCourse().getTeacher() != null) {
            String ownerId = item.getCourse().getTeacher().getId();
            if (!ownerId.equals(teacherId)) {
                throw new SecurityException("Bạn không có quyền xem cảnh báo của bài giảng này");
            }
        }
        return lessonAlertRepository.findByContentItemIdOrderByStartSecAsc(contentItemId).stream()
                .filter(a -> !"MERGED".equalsIgnoreCase(a.getStatus()))
                .map(LessonAlertDto::from)
                .toList();
    }

    public int scanAndGenerateAlertsForTeacher(String teacherId) {
        List<String> ids = contentItemRepository.findByTeacherIdAndType(teacherId, "VIDEO_LECTURE")
                .stream().map(ContentItem::getId).toList();
        int createdAlertsCount = 0;
        TransactionTemplate tx = new TransactionTemplate(txManager);

        for (String id : ids) {
            try {
                Integer count = tx.execute(s ->
                        contentItemRepository.findById(id).map(this::processItemAlerts).orElse(0)
                );
                if (count != null) {
                    createdAlertsCount += count;
                }
            } catch (Exception e) {
                log.error("[SegmentAlertService] Lỗi khi xử lý bài giảng {} của giảng viên {}: {}", id, teacherId, e.getMessage(), e);
            }
        }
        return createdAlertsCount;
    }

    @Transactional
    public LessonAlertDto updateAlertStatus(String teacherId, String alertId, String newStatus) {
        if (newStatus == null || !TEACHER_UPDATABLE_STATUSES.contains(newStatus.trim().toUpperCase())) {
            throw new IllegalArgumentException("Trạng thái cảnh báo không hợp lệ. Chỉ chấp nhận: " + TEACHER_UPDATABLE_STATUSES);
        }

        LessonAlert alert = lessonAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cảnh báo"));

        if (alert.getContentItem().getCourse() != null && alert.getContentItem().getCourse().getTeacher() != null) {
            String ownerId = alert.getContentItem().getCourse().getTeacher().getId();
            if (!ownerId.equals(teacherId)) {
                throw new SecurityException("Bạn không có quyền chỉnh sửa cảnh báo này");
            }
        }

        alert.setStatus(newStatus.trim().toUpperCase());
        return LessonAlertDto.from(lessonAlertRepository.save(alert));
    }
}
