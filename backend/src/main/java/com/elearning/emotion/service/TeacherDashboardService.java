package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherDashboardService {

    private final OrderRepository orderRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final ContentItemRepository contentItemRepository;
    private final EmotionLogRepository emotionLogRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final LessonAlertRepository lessonAlertRepository;
    private final com.elearning.emotion.config.EmotionAlertProperties alertProperties;
    private final TeacherWalletEntryRepository teacherWalletEntryRepository;
    private final CourseCustomSectionRepository courseCustomSectionRepository;

    @Transactional(readOnly = true)
    public TeacherDashboardDto getTeacherDashboard(String teacherId) {
        BigDecimal totalRevenue = orderRepository.sumRevenueByTeacherId(teacherId);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }
        BigDecimal netRevenue = teacherWalletEntryRepository.sumEarnedByTeacherId(teacherId);
        if (netRevenue == null) {
            netRevenue = BigDecimal.ZERO;
        }

        long totalStudents = enrollmentRepository.countDistinctStudentsByTeacherId(teacherId);
        long totalCourses = courseRepository.countByTeacherId(teacherId);
        long publishedCourses = courseRepository.countByTeacherIdAndStatus(teacherId, "PUBLISHED");

        // 1. Tab Giao dịch (Recent paid orders)
        List<Order> paidOrders = orderRepository.findPaidOrdersByTeacherId(teacherId);
        List<TeacherEnrollmentDto> recentEnrollments = paidOrders.stream()
                .map(o -> new TeacherEnrollmentDto(
                        o.getId(),
                        o.getOrderCode(),
                        o.getUser() != null ? o.getUser().getId() : null,
                        o.getUser() != null ? o.getUser().getFullName() : "Học viên",
                        o.getUser() != null ? o.getUser().getEmail() : "—",
                        o.getCourse() != null ? o.getCourse().getId() : null,
                        o.getCourse() != null ? o.getCourse().getTitle() : "Khóa học",
                        o.getAmount(),
                        o.getPaidAt() != null ? o.getPaidAt() : o.getCreatedAt(),
                        o.getStatus()
                ))
                .toList();

        // 2. Tab Học viên & Tiến độ (Enrollments with progress percent)
        List<Enrollment> enrollments = enrollmentRepository.findByTeacherIdOrderByEnrolledAtDesc(teacherId);
        List<TeacherStudentProgressDto> students = enrollments.stream()
                .map(e -> new TeacherStudentProgressDto(
                        e.getId(),
                        e.getUser() != null ? e.getUser().getId() : null,
                        e.getUser() != null ? e.getUser().getFullName() : "Học viên",
                        e.getUser() != null ? e.getUser().getEmail() : "—",
                        e.getCourse() != null ? e.getCourse().getId() : null,
                        e.getCourse() != null ? e.getCourse().getTitle() : "Khóa học",
                        e.getEnrolledAt(),
                        e.getProgressPercent() != null ? e.getProgressPercent() : 0.0f
                ))
                .toList();

        // 3. Tab Khóa học (Courses with student count and course revenue)
        List<Course> teacherCourses = courseRepository.findByTeacherId(teacherId);
        List<TeacherCourseSummaryDto> courses = teacherCourses.stream()
                .map(c -> {
                    long studentCount = enrollmentRepository.countByCourseId(c.getId());
                    BigDecimal revenue = orderRepository.sumRevenueByCourseId(c.getId());
                    return new TeacherCourseSummaryDto(
                            c.getId(),
                            c.getTitle(),
                            c.getLevel(),
                            c.getPrice(),
                            c.getStatus(),
                            studentCount,
                            revenue != null ? revenue : BigDecimal.ZERO
                    );
                })
                .toList();

        // 4. Tab Phân tích Cảm xúc AI (Emotion & Focus analytics)
        List<LearningSession> sessions = learningSessionRepository.findByTeacherId(teacherId);
        TeacherEmotionStatsDto emotionStats;
        if (sessions.isEmpty()) {
            // Ngay cả khi chưa có session, vẫn lấy danh sách bài giảng video để giáo viên xem
            List<TeacherEmotionLessonDto> emptyLessonStats = new ArrayList<>();
            for (Course c : teacherCourses) {
                List<ContentItem> courseItems = sortItemsLikeCourse(c.getId(), contentItemRepository.findByCourseId(c.getId()));
                for (ContentItem item : courseItems) {
                    if (item.isVideoLecture()) {
                        emptyLessonStats.add(new TeacherEmotionLessonDto(
                                item.getId(),
                                item.getTitle(),
                                c.getId(),
                                c.getTitle(),
                                item.getSectionCode(),
                                resolveSectionName(item.getSectionCode()),
                                item.getGroup() != null ? item.getGroup().getTitle() : null,
                                0.0,
                                0L,
                                "Chưa có dữ liệu"
                        ));
                    }
                }
            }
            emotionStats = new TeacherEmotionStatsDto(
                    0.0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    emptyLessonStats
            );
        } else {
            // Điểm tập trung được tính từ session_bucket_stats (cùng nguồn với biểu đồ mốc thời gian),
            // KHÔNG phụ thuộc focus_score lưu sẵn trong phiên học vì giá trị đó có thể null/0 nếu phiên
            // chưa kết thúc hoặc bị chốt trước khi hàng đợi ghi log kịp flush.
            Map<String, SessionBucketStatsRepository.LessonFocusTotalsProjection> focusTotalsByLesson =
                    sessionBucketStatsRepository.getFocusTotalsByLessonForTeacher(teacherId).stream()
                            .collect(Collectors.toMap(
                                    SessionBucketStatsRepository.LessonFocusTotalsProjection::getContentItemId,
                                    p -> p,
                                    (a, b) -> a));

            SessionBucketStatsRepository.SessionTotalsProjection teacherTotals =
                    sessionBucketStatsRepository.getTotalsByTeacherId(teacherId);
            double pooledOverall = teacherTotals != null
                    ? pooledFocus(teacherTotals.getTotal(), teacherTotals.getEngaged(),
                                  teacherTotals.getInterested(), teacherTotals.getNoFace())
                    : -1.0;
            double avgFocus = pooledOverall >= 0
                    ? pooledOverall
                    : sessions.stream()
                            .filter(s -> s.getFocusScore() != null)
                            .mapToDouble(LearningSession::getFocusScore)
                            .average()
                            .orElse(0.0);

            Map<String, List<LearningSession>> sessionsByLesson = sessions.stream()
                    .filter(s -> s.getContentItem() != null)
                    .collect(Collectors.groupingBy(s -> s.getContentItem().getId()));

            Map<String, Long> alertCountByLesson = lessonAlertRepository.findByTeacherIdAndStatus(teacherId, "OPEN")
                    .stream()
                    .filter(a -> a.getContentItem() != null)
                    .collect(Collectors.groupingBy(a -> a.getContentItem().getId(), Collectors.counting()));

            List<TeacherEmotionLessonDto> lessonStats = new ArrayList<>();
            Set<String> processedItemIds = new HashSet<>();

            for (Course c : teacherCourses) {
                List<ContentItem> courseItems = sortItemsLikeCourse(c.getId(), contentItemRepository.findByCourseId(c.getId()));
                for (ContentItem item : courseItems) {
                    if (item.isVideoLecture()) {
                        processedItemIds.add(item.getId());
                        List<LearningSession> itemSessions = sessionsByLesson.getOrDefault(item.getId(), Collections.emptyList());
                        double itemAvgFocus = resolveLessonFocus(focusTotalsByLesson.get(item.getId()), itemSessions);
                        long alertCount = alertCountByLesson.getOrDefault(item.getId(), 0L);
                        String statusLabel;
                        if (alertCount > 0) {
                            statusLabel = "Có " + alertCount + " đoạn cần xem lại";
                        } else if (itemSessions.isEmpty()) {
                            statusLabel = "Chưa có dữ liệu";
                        } else if (itemAvgFocus >= 70) {
                            statusLabel = "Tập trung tốt";
                        } else if (itemAvgFocus >= 50) {
                            statusLabel = "Bình thường";
                        } else {
                            statusLabel = "Cần cải thiện";
                        }

                        String secName = resolveSectionName(item.getSectionCode());
                        String grpTitle = item.getGroup() != null ? item.getGroup().getTitle() : null;

                        lessonStats.add(new TeacherEmotionLessonDto(
                                item.getId(),
                                item.getTitle(),
                                c.getId(),
                                c.getTitle(),
                                item.getSectionCode(),
                                secName,
                                grpTitle,
                                Math.round(itemAvgFocus * 10.0) / 10.0,
                                (long) itemSessions.size(),
                                statusLabel,
                                alertCount
                        ));
                    }
                }
            }

            // Đảm bảo không sót bài giảng nào có session nhưng chưa nằm trong danh sách trên
            List<Map.Entry<String, List<LearningSession>>> leftoverEntries = new ArrayList<>(sessionsByLesson.entrySet());
            leftoverEntries.sort(Comparator.comparing(
                    (Map.Entry<String, List<LearningSession>> e) -> e.getValue().get(0).getContentItem(),
                    courseOrderComparator(Collections.emptyMap())));
            for (Map.Entry<String, List<LearningSession>> entry : leftoverEntries) {
                if (!processedItemIds.contains(entry.getKey())) {
                    List<LearningSession> itemSessions = entry.getValue();
                    ContentItem item = itemSessions.get(0).getContentItem();
                    double itemAvgFocus = resolveLessonFocus(focusTotalsByLesson.get(item.getId()), itemSessions);
                    long alertCount = alertCountByLesson.getOrDefault(item.getId(), 0L);
                    String statusLabel;
                    if (alertCount > 0) {
                        statusLabel = "Có " + alertCount + " đoạn cần xem lại";
                    } else if (itemAvgFocus >= 70) {
                        statusLabel = "Tập trung tốt";
                    } else if (itemAvgFocus >= 50) {
                        statusLabel = "Bình thường";
                    } else {
                        statusLabel = "Cần cải thiện";
                    }
                    String cId = item.getCourse() != null ? item.getCourse().getId() : "";
                    String cTitle = item.getCourse() != null ? item.getCourse().getTitle() : "Khóa học";
                    String secName = resolveSectionName(item.getSectionCode());
                    String grpTitle = item.getGroup() != null ? item.getGroup().getTitle() : null;

                    lessonStats.add(new TeacherEmotionLessonDto(
                            item.getId(),
                            item.getTitle(),
                            cId,
                            cTitle,
                            item.getSectionCode(),
                            secName,
                            grpTitle,
                            Math.round(itemAvgFocus * 10.0) / 10.0,
                            (long) itemSessions.size(),
                            statusLabel,
                            alertCount
                    ));
                }
            }

            // H2: Thay thế số liệu giả bằng tổng số lượng mẫu thực tế từ bảng session_bucket_stats
            SessionBucketStatsRepository.SessionTotalsProjection totals = sessionBucketStatsRepository.getTotalsByTeacherId(teacherId);
            long validTotal = totals != null
                    ? (totals.getEngaged() + totals.getInterested() + totals.getNeutral() + totals.getConfused() + totals.getBored())
                    : 0L;

            int happy = 0;
            int neutral = 0;
            int confused = 0;
            int bored = 0;

            if (validTotal > 0) {
                happy = (int) Math.round(((double) (totals.getEngaged() + totals.getInterested()) / validTotal) * 100);
                neutral = (int) Math.round(((double) totals.getNeutral() / validTotal) * 100);
                confused = (int) Math.round(((double) totals.getConfused() / validTotal) * 100);
                bored = Math.max(0, 100 - (happy + neutral + confused));
            }

            emotionStats = new TeacherEmotionStatsDto(
                    Math.round(avgFocus * 10.0) / 10.0,
                    sessions.size(),
                    happy,
                    neutral,
                    confused,
                    bored,
                    lessonStats
            );
        }

        return new TeacherDashboardDto(
                totalRevenue,
                netRevenue,
                totalStudents,
                totalCourses,
                publishedCourses,
                (long) paidOrders.size(),
                recentEnrollments,
                students,
                courses,
                emotionStats
        );
    }

    /**
     * Giai doan 8: Thong ke chi tiet cam xuc tung moc thoi gian cua video bai giang (Teacher Analytics).
     * Giup giang vien biet chinh xac giay/phut thu may hoc vien bi boi roi hoac mat tap trung nhieu nhat.
     */
    @Transactional(readOnly = true)
    public VideoEmotionTimelineDto getVideoEmotionTimeline(String teacherId, String contentItemId) {
        return getVideoEmotionTimeline(teacherId, contentItemId, null);
    }

    @Transactional
    public VideoEmotionTimelineDto getVideoEmotionTimeline(String teacherId, String contentItemId, Integer customDurationSec) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay bai giang video"));

        MediaAsset media = item.getVideoMedia();
        if (customDurationSec != null && customDurationSec > 0 && media != null) {
            media.setDurationSec(customDurationSec);
            mediaAssetRepository.save(media);
        }

        String videoUrl = media != null ? media.getUrl() : null;
        Integer videoDurationSec = (customDurationSec != null && customDurationSec > 0)
                ? customDurationSec
                : (media != null ? media.getDurationSec() : null);

        List<SessionBucketStatsRepository.BucketAggProjection> bucketAggs = sessionBucketStatsRepository.aggregateByContentItemId(contentItemId);
        List<LearningSession> sessions = learningSessionRepository.findByTeacherId(teacherId).stream()
                .filter(s -> s.getContentItem() != null && s.getContentItem().getId().equals(contentItemId))
                .toList();

        String lessonTitle = item.getTitle();
        String courseTitle = item.getCourse() != null ? item.getCourse().getTitle() : "Khoa hoc";
        long totalSessions = sessions.size();
        double avgFocus = sessions.stream()
                .filter(s -> s.getFocusScore() != null)
                .mapToDouble(LearningSession::getFocusScore)
                .average()
                .orElse(0.0);
        avgFocus = Math.round(avgFocus * 10.0) / 10.0;
        // Ưu tiên tính từ bucket (cùng nguồn với các mốc bên dưới) để số liệu luôn khớp biểu đồ
        long aggTotal = bucketAggs.stream().mapToLong(b -> b.getTotalSamples() != null ? b.getTotalSamples() : 0L).sum();
        long aggEngaged = bucketAggs.stream().mapToLong(b -> b.getEngagedCount() != null ? b.getEngagedCount() : 0L).sum();
        long aggInterested = bucketAggs.stream().mapToLong(b -> b.getInterestedCount() != null ? b.getInterestedCount() : 0L).sum();
        long aggNoFace = bucketAggs.stream().mapToLong(b -> b.getNoFaceCount() != null ? b.getNoFaceCount() : 0L).sum();
        double pooledTimelineFocus = pooledFocus(aggTotal, aggEngaged, aggInterested, aggNoFace);
        if (pooledTimelineFocus >= 0) {
            avgFocus = pooledTimelineFocus;
        }
        int minStudents = alertProperties != null ? alertProperties.getMinStudents() : 5;

        if (bucketAggs.isEmpty()) {
            return new VideoEmotionTimelineDto(
                    contentItemId,
                    lessonTitle,
                    courseTitle,
                    videoUrl,
                    videoDurationSec,
                    totalSessions,
                    avgFocus,
                    "00:00",
                    0.0,
                    "00:00",
                    0.0,
                    List.of(),
                    List.of("Chua co du lieu khung hinh camera cho bai giang nay."),
                    minStudents
            );
        }

        // Gom các bucket 10 giây thành các mốc phân tích 30 giây (0-30s, 30-60s, 60-90s, ...)
        Map<Integer, List<SessionBucketStatsRepository.BucketAggProjection>> segMap = bucketAggs.stream()
                .collect(Collectors.groupingBy(b -> b.getBucketIndex() / 3));

        int maxRecordedSeg = segMap.keySet().stream().max(Integer::compareTo).orElse(0);
        int maxSeg = maxRecordedSeg;
        if (videoDurationSec != null && videoDurationSec > 0) {
            int expectedMaxSeg = Math.max(0, (int) Math.ceil(videoDurationSec / 30.0) - 1);
            maxSeg = Math.max(maxSeg, expectedMaxSeg);
        }

        // Lấy danh sách các cảnh báo điểm nghẽn đang active (OPEN | ACKED) của bài giảng này
        List<LessonAlert> activeAlerts = lessonAlertRepository.findByContentItemIdAndStatusIn(
                contentItemId, List.of("OPEN", "ACKED")
        );

        List<VideoEmotionTimelineDto.TimelineSegmentDto> segments = new ArrayList<>();
        int peakConfusedSeg = -1;
        double maxConfusedPct = -1.0;
        int peakBoredSeg = -1;
        double maxBoredPct = -1.0;

        for (int i = 0; i <= maxSeg; i++) {
            List<SessionBucketStatsRepository.BucketAggProjection> items = segMap.getOrDefault(i, Collections.emptyList());
            int startSec = i * 30;
            int endSec = startSec + 30;
            String timeLabel = String.format("%02d:%02d - %02d:%02d", startSec / 60, startSec % 60, endSec / 60, endSec % 60);

            long total = items.stream().mapToLong(x -> x.getTotalSamples() != null ? x.getTotalSamples() : 0L).sum();
            long studentCount = items.stream().mapToLong(x -> x.getStudentCount() != null ? x.getStudentCount() : 0L).max().orElse(0L);
            boolean hasEnoughData = studentCount >= minStudents;

            // Định nghĩa thống nhất điểm nghẽn: Trùng khớp với khoảng cảnh báo LessonAlert active
            boolean isProblematic = hasEnoughData && activeAlerts.stream().anyMatch(a ->
                    a.getStartSec() < endSec && a.getEndSec() > startSec
            );

            if (total == 0) {
                segments.add(new VideoEmotionTimelineDto.TimelineSegmentDto(
                        startSec, endSec, timeLabel, 0, 0, 0, 0, 0, 0, 0, 0, isProblematic, false
                ));
                continue;
            }

            long confusedCount = items.stream().mapToLong(x -> x.getConfusedCount() != null ? x.getConfusedCount() : 0L).sum();
            long boredCount = items.stream().mapToLong(x -> x.getBoredCount() != null ? x.getBoredCount() : 0L).sum();
            long engagedCount = items.stream().mapToLong(x -> x.getEngagedCount() != null ? x.getEngagedCount() : 0L).sum();
            long interestedCount = items.stream().mapToLong(x -> x.getInterestedCount() != null ? x.getInterestedCount() : 0L).sum();
            long neutralCount = items.stream().mapToLong(x -> x.getNeutralCount() != null ? x.getNeutralCount() : 0L).sum();
            long noFaceCount = items.stream().mapToLong(x -> x.getNoFaceCount() != null ? x.getNoFaceCount() : 0L).sum();

            double confusedPct = Math.round(((double) confusedCount / total) * 1000.0) / 10.0;
            double boredPct = Math.round(((double) boredCount / total) * 1000.0) / 10.0;
            double engagedPct = Math.round(((double) engagedCount / total) * 1000.0) / 10.0;
            double interestedPct = Math.round(((double) interestedCount / total) * 1000.0) / 10.0;
            double neutralPct = Math.round(((double) neutralCount / total) * 1000.0) / 10.0;
            double noFacePct = Math.round(((double) noFaceCount / total) * 1000.0) / 10.0;

            if (confusedPct > maxConfusedPct) {
                maxConfusedPct = confusedPct;
                peakConfusedSeg = i;
            }
            if (boredPct > maxBoredPct) {
                maxBoredPct = boredPct;
                peakBoredSeg = i;
            }

            segments.add(new VideoEmotionTimelineDto.TimelineSegmentDto(
                    startSec, endSec, timeLabel, total, studentCount,
                    confusedPct, boredPct, engagedPct, interestedPct, neutralPct, noFacePct,
                    isProblematic, hasEnoughData
            ));
        }

        String peakConfusedTime = peakConfusedSeg >= 0
                ? String.format("%02d:%02d", (peakConfusedSeg * 30) / 60, (peakConfusedSeg * 30) % 60)
                : "00:00";
        double peakConfusedPct = Math.max(0.0, maxConfusedPct);

        String peakBoredTime = peakBoredSeg >= 0
                ? String.format("%02d:%02d", (peakBoredSeg * 30) / 60, (peakBoredSeg * 30) % 60)
                : "00:00";
        double peakBoredPct = Math.max(0.0, maxBoredPct);

        List<String> recommendations = new ArrayList<>();

        // Sử dụng các khuyến nghị sư phạm chuẩn hóa từ các alert active của bài
        if (!activeAlerts.isEmpty()) {
            for (LessonAlert alert : activeAlerts) {
                int as = alert.getStartSec() != null ? alert.getStartSec() : 0;
                int ae = alert.getEndSec() != null ? alert.getEndSec() : 0;
                String alertTime = String.format("%02d:%02d - %02d:%02d", as / 60, as % 60, ae / 60, ae % 60);
                String dom = alert.getDominantState() != null ? alert.getDominantState() : "CONFUSED";
                int rec = alert.getRecurringStudents() != null ? alert.getRecurringStudents() : 0;
                int sus = alert.getSustainedStudents() != null ? alert.getSustainedStudents() : 0;
                double ratio = alert.getNegativeRatio() != null ? alert.getNegativeRatio().doubleValue() * 100 : 0.0;

                String advice = LessonAlertDto.buildRecommendation(dom, rec, sus, ratio);
                recommendations.add(String.format("Mốc %s (%s, %d học viên bị ảnh hưởng): %s",
                        alertTime, "CONFUSED".equalsIgnoreCase(dom) ? "Bối rối" : "Mất tập trung",
                        alert.getAffectedStudents() != null ? alert.getAffectedStudents() : alert.getNStudents(),
                        advice));
            }
        }

        if (recommendations.isEmpty()) {
            if (peakConfusedPct >= 25.0) {
                recommendations.add(String.format(
                        "Tại mốc thời gian %s (tỷ lệ bối rối %.1f%%): Đoạn này học viên có dấu hiệu khó hiểu hoặc cấu trúc ngữ pháp khó. Giảng viên nên bổ sung thêm ví dụ thực tế hoặc chia nhỏ slide giải thích.",
                        peakConfusedTime, peakConfusedPct
                ));
            }
            if (peakBoredPct >= 25.0) {
                recommendations.add(String.format(
                        "Tại mốc thời gian %s (tỷ lệ mất tập trung %.1f%%): Đoạn này học viên có xu hướng giảm chú ý. Giảng viên nên chèn thêm câu hỏi tương tác ngắn hoặc thay đổi ngữ điệu bài giảng.",
                        peakBoredTime, peakBoredPct
                ));
            }
        }

        if (recommendations.isEmpty()) {
            recommendations.add("Học viên tiếp thu rất tốt bài giảng, duy trì mức độ tập trung ổn định xuyên suốt các mốc thời gian của video.");
        }

        return new VideoEmotionTimelineDto(
                contentItemId,
                lessonTitle,
                courseTitle,
                videoUrl,
                videoDurationSec,
                totalSessions,
                avgFocus,
                peakConfusedTime,
                peakConfusedPct,
                peakBoredTime,
                peakBoredPct,
                segments,
                recommendations,
                minStudents
        );
    }

    /**
     * Điểm tập trung gộp = (ENGAGED + INTERESTED) / mẫu hợp lệ (loại NO_FACE) * 100, làm tròn 1 chữ số.
     * Trả về -1 nếu không có mẫu hợp lệ nào (để caller biết mà dùng giá trị dự phòng).
     */
    private static double pooledFocus(Long total, Long engaged, Long interested, Long noFace) {
        long t = total != null ? total : 0L;
        long nf = noFace != null ? noFace : 0L;
        long valid = t - nf;
        if (valid <= 0) return -1.0;
        long good = (engaged != null ? engaged : 0L) + (interested != null ? interested : 0L);
        return Math.round(((double) good / valid) * 1000.0) / 10.0;
    }

    /** Điểm tập trung TB của 1 bài giảng: ưu tiên số liệu bucket, dự phòng bằng focus_score đã lưu của các phiên. */
    private static double resolveLessonFocus(
            SessionBucketStatsRepository.LessonFocusTotalsProjection totals, List<LearningSession> itemSessions) {
        if (totals != null) {
            double pooled = pooledFocus(totals.getTotal(), totals.getEngaged(), totals.getInterested(), totals.getNoFace());
            if (pooled >= 0) return pooled;
        }
        return itemSessions.stream()
                .filter(s -> s.getFocusScore() != null)
                .mapToDouble(LearningSession::getFocusScore)
                .average()
                .orElse(0.0);
    }

    /** Thứ tự các mục chuẩn giống sidebar khóa học: Từ vựng → Ngữ pháp → Part 1..7 → Chép chính tả */
    private static final List<String> STANDARD_SECTION_ORDER = List.of(
            "VOCAB", "GRAMMAR", "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "DICTATION");

    /**
     * Sắp xếp hoạt động của 1 khóa học đúng thứ tự hiển thị trong khóa học:
     * Mục (chuẩn → tùy chỉnh theo orderIndex) → Nhóm (orderIndex) → Hoạt động (orderIndex).
     */
    private List<ContentItem> sortItemsLikeCourse(String courseId, List<ContentItem> items) {
        Map<String, Integer> customRank = new HashMap<>();
        for (CourseCustomSection cs : courseCustomSectionRepository.findByCourseIdOrderByOrderIndex(courseId)) {
            customRank.put(cs.getSectionCode(), cs.getOrderIndex() != null ? cs.getOrderIndex() : 0);
        }
        List<ContentItem> sorted = new ArrayList<>(items);
        sorted.sort(courseOrderComparator(customRank));
        return sorted;
    }

    private Comparator<ContentItem> courseOrderComparator(Map<String, Integer> customRank) {
        return Comparator
                .comparingInt((ContentItem it) -> sectionRank(it.getSectionCode()))
                .thenComparingInt(it -> customRank.getOrDefault(it.getSectionCode(), 0))
                .thenComparing(it -> it.getSectionCode() == null ? "" : it.getSectionCode())
                // Hoạt động nằm trong Nhóm hiển thị trước, hoạt động lẻ (không có Nhóm) hiển thị sau
                .thenComparingInt(it -> it.getGroup() == null ? 1 : 0)
                .thenComparingInt(it -> it.getGroup() != null && it.getGroup().getOrderIndex() != null
                        ? it.getGroup().getOrderIndex() : 0)
                .thenComparing(it -> it.getGroup() != null && it.getGroup().getId() != null
                        ? it.getGroup().getId() : "")
                .thenComparingInt(it -> it.getOrderIndex() != null ? it.getOrderIndex() : 0);
    }

    private static int sectionRank(String sectionCode) {
        int idx = sectionCode == null ? -1 : STANDARD_SECTION_ORDER.indexOf(sectionCode);
        // Mục tùy chỉnh (CUSTOM_...) và mục lạ xếp sau các mục chuẩn
        return idx >= 0 ? idx : STANDARD_SECTION_ORDER.size();
    }

    private String resolveSectionName(String sectionCode) {
        if (sectionCode == null) return "Mục chung";
        return switch (sectionCode) {
            case "VOCAB" -> "Từ vựng";
            case "GRAMMAR" -> "Ngữ pháp";
            case "PART1" -> "Part 1: Photographs";
            case "PART2" -> "Part 2: Question & Response";
            case "PART3" -> "Part 3: Short Conversations";
            case "PART4" -> "Part 4: Short Talks";
            case "PART5" -> "Part 5: Incomplete Sentences";
            case "PART6" -> "Part 6: Text Completion";
            case "PART7" -> "Part 7: Reading Comprehension";
            case "DICTATION" -> "Luyện nghe chép chính tả";
            default -> {
                if (sectionCode.startsWith("CUSTOM_")) {
                    yield "Mục tùy chỉnh";
                }
                yield sectionCode;
            }
        };
    }
}