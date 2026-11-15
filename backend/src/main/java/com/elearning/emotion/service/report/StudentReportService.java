package com.elearning.emotion.service.report;

import com.elearning.emotion.dto.report.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.repository.SessionBucketStatsRepository.BucketAggProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentReportService {

    private final LearningSessionRepository learningSessionRepository;
    private final AttemptRepository attemptRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    private final ContentItemRepository contentItemRepository;
    private final ReportCalculationService reportCalculationService;
    private final FlashcardProgressRepository flashcardProgressRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabExampleRepository vocabExampleRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Tab 1: Tổng quan (KPIs, Biểu đồ hoạt động theo ngày, Điểm nổi bật)
     */
    public StudentReportOverviewDto getOverview(String userId, Integer days, String courseId) {
        int rangeDays = (days == null || days <= 0) ? 30 : days;
        LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
        LocalDate startDate = today.minusDays(rangeDays - 1);

        LocalDateTime fromUtc = reportCalculationService.getStartOfDayUtc(startDate);
        LocalDateTime toUtc = reportCalculationService.getEndOfDayUtc(today);

        // 1. Lọc sessions
        List<LearningSession> sessions = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(userId, fromUtc, toUtc);
        if (courseId != null && !courseId.isBlank()) {
            sessions = sessions.stream()
                    .filter(s -> s.getContentItem() != null && s.getContentItem().getCourse() != null && courseId.equals(s.getContentItem().getCourse().getId()))
                    .toList();
        }

        // 2. Lọc attempts
        List<Attempt> attempts = attemptRepository.findByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(userId, fromUtc, toUtc);
        if (courseId != null && !courseId.isBlank()) {
            attempts = attempts.stream()
                    .filter(a -> a.getContentItem() != null && a.getContentItem().getCourse() != null && courseId.equals(a.getContentItem().getCourse().getId()))
                    .toList();
        }

        // 3. Tính KPI
        long totalStudySeconds = sessions.stream()
                .mapToLong(reportCalculationService::getEffectiveStudySeconds)
                .sum();
        int totalSessions = sessions.size();

        List<Float> validFocusList = sessions.stream()
                .map(LearningSession::getFocusScore)
                .filter(Objects::nonNull)
                .toList();
        Double avgFocusScore = validFocusList.isEmpty() ? null
                : Math.round(validFocusList.stream().mapToDouble(Float::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

        List<Float> validAttemptScores = attempts.stream()
                .map(Attempt::getScore)
                .filter(Objects::nonNull)
                .toList();
        Double avgPracticeScore = validAttemptScores.isEmpty() ? null
                : Math.round(validAttemptScores.stream().mapToDouble(Float::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

        Double courseProgressPercent;
        if (courseId != null && !courseId.isBlank()) {
            courseProgressPercent = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                    .map(e -> e.getProgressPercent() != null ? e.getProgressPercent() : 0.0)
                    .orElse(0.0);
        } else {
            List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
            courseProgressPercent = enrollments.isEmpty() ? 0.0
                    : Math.round(enrollments.stream().mapToDouble(e -> e.getProgressPercent() != null ? e.getProgressPercent() : 0.0).average().orElse(0.0) * 10.0) / 10.0;
        }

        int streakDays = calculateStreak(userId, today);

        ReportKpiDto kpi = new ReportKpiDto(
                totalStudySeconds,
                totalSessions,
                avgFocusScore,
                avgPracticeScore,
                courseProgressPercent,
                streakDays
        );

        // 4. Biểu đồ hoạt động theo từng ngày trong khoảng thời gian
        Map<LocalDate, List<LearningSession>> sessionsByDate = sessions.stream()
                .collect(Collectors.groupingBy(s -> reportCalculationService.toVnLocalDate(s.getStartTime())));

        Map<LocalDate, List<Attempt>> attemptsByDate = attempts.stream()
                .filter(a -> a.getSubmittedAt() != null)
                .collect(Collectors.groupingBy(a -> reportCalculationService.toVnLocalDate(a.getSubmittedAt())));

        List<DailyActivityPointDto> dailyActivity = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(today); d = d.plusDays(1)) {
            List<LearningSession> dSessions = sessionsByDate.getOrDefault(d, Collections.emptyList());
            List<Attempt> dAttempts = attemptsByDate.getOrDefault(d, Collections.emptyList());

            long dSeconds = dSessions.stream().mapToLong(reportCalculationService::getEffectiveStudySeconds).sum();
            List<Float> dFocusList = dSessions.stream().map(LearningSession::getFocusScore).filter(Objects::nonNull).toList();
            Double dAvgFocus = dFocusList.isEmpty() ? null
                    : Math.round(dFocusList.stream().mapToDouble(Float::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

            dailyActivity.add(new DailyActivityPointDto(
                    d.toString(),
                    dSeconds,
                    dAvgFocus,
                    dSessions.size(),
                    dAttempts.size()
            ));
        }

        // 5. Highlights nhận xét nổi bật
        List<String> highlights = generateHighlights(streakDays, avgFocusScore, avgPracticeScore, totalSessions, attempts.size());

        return new StudentReportOverviewDto(kpi, dailyActivity, highlights);
    }

    /**
     * Tab 2: Danh sách video bài giảng kèm cảm xúc & tập trung
     */
    public List<StudentLessonEmotionSummaryDto> getLessonEmotionSummaries(String userId, Integer days, String courseId) {
        int rangeDays = (days == null || days <= 0) ? 30 : days;
        LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
        LocalDate startDate = today.minusDays(rangeDays - 1);

        LocalDateTime fromUtc = reportCalculationService.getStartOfDayUtc(startDate);
        LocalDateTime toUtc = reportCalculationService.getEndOfDayUtc(today);

        List<LearningSession> sessions = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(userId, fromUtc, toUtc);
        if (courseId != null && !courseId.isBlank()) {
            sessions = sessions.stream()
                    .filter(s -> s.getContentItem() != null && s.getContentItem().getCourse() != null && courseId.equals(s.getContentItem().getCourse().getId()))
                    .toList();
        }

        Map<String, List<LearningSession>> grouped = sessions.stream()
                .filter(s -> s.getContentItem() != null)
                .collect(Collectors.groupingBy(s -> s.getContentItem().getId(), LinkedHashMap::new, Collectors.toList()));

        List<StudentLessonEmotionSummaryDto> result = new ArrayList<>();

        for (Map.Entry<String, List<LearningSession>> entry : grouped.entrySet()) {
            String contentItemId = entry.getKey();
            List<LearningSession> itemSessions = entry.getValue();
            ContentItem item = itemSessions.get(0).getContentItem();

            long totalActiveSec = itemSessions.stream().mapToLong(reportCalculationService::getEffectiveStudySeconds).sum();
            int sessionsCount = itemSessions.size();
            LocalDateTime lastSessionTime = itemSessions.stream()
                    .map(LearningSession::getStartTime)
                    .max(LocalDateTime::compareTo)
                    .orElse(null);
            String lastStudiedAtStr = lastSessionTime != null ? lastSessionTime.format(TIME_FMT) : "";

            // Lấy session_bucket_stats cá nhân cho item này
            List<BucketAggProjection> buckets = sessionBucketStatsRepository.aggregateByUserIdAndContentItemId(userId, contentItemId);

            long totalSamples = 0;
            long engaged = 0;
            long interested = 0;
            long neutral = 0;
            long confused = 0;
            long bored = 0;
            long noFace = 0;
            boolean hasReview = false;

            for (BucketAggProjection b : buckets) {
                long bTotal = b.getTotalSamples() != null ? b.getTotalSamples() : 0;
                long bConfused = b.getConfusedCount() != null ? b.getConfusedCount() : 0;
                long bBored = b.getBoredCount() != null ? b.getBoredCount() : 0;

                totalSamples += bTotal;
                engaged += b.getEngagedCount() != null ? b.getEngagedCount() : 0;
                interested += b.getInterestedCount() != null ? b.getInterestedCount() : 0;
                neutral += b.getNeutralCount() != null ? b.getNeutralCount() : 0;
                confused += bConfused;
                bored += bBored;
                noFace += b.getNoFaceCount() != null ? b.getNoFaceCount() : 0;

                if (bTotal >= 3 && ((double) bConfused / bTotal >= 0.35 || (double) bBored / bTotal >= 0.40)) {
                    hasReview = true;
                }
            }

            var metrics = reportCalculationService.calculateMetrics(totalSamples, engaged, interested, neutral, confused, bored, noFace);

            // Gợi ý thích ứng
            List<String> sIds = itemSessions.stream().map(LearningSession::getId).toList();
            List<AdaptiveSuggestion> suggestions = adaptiveSuggestionRepository.findBySessionIdIn(sIds);
            int sugCount = suggestions.size();
            int acceptedCount = (int) suggestions.stream().filter(s -> Boolean.TRUE.equals(s.getWasAccepted())).count();

            result.add(new StudentLessonEmotionSummaryDto(
                    contentItemId,
                    item.getTitle(),
                    item.getCourse() != null ? item.getCourse().getId() : null,
                    item.getCourse() != null ? item.getCourse().getTitle() : null,
                    item.getSectionCode(),
                    totalActiveSec,
                    sessionsCount,
                    metrics.hasSufficientData() ? metrics.focusScore() : null,
                    metrics.presenceRate(),
                    metrics.engagedPercent(),
                    metrics.interestedPercent(),
                    metrics.confusedPercent(),
                    metrics.boredPercent(),
                    sugCount,
                    acceptedCount,
                    hasReview,
                    lastStudiedAtStr
            ));
        }

        return result;
    }

    /**
     * Tab 2: Chi tiết cảm xúc & Timeline 10s của 1 video bài giảng
     */
    public StudentLessonEmotionDetailDto getLessonEmotionDetail(String userId, String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học: " + contentItemId));

        Integer videoDuration = (item.getVideoMedia() != null && item.getVideoMedia().getDurationSec() != null)
                ? item.getVideoMedia().getDurationSec()
                : null;

        List<BucketAggProjection> buckets = sessionBucketStatsRepository.aggregateByUserIdAndContentItemId(userId, contentItemId);

        long totalSamples = 0;
        long engaged = 0;
        long interested = 0;
        long neutral = 0;
        long confused = 0;
        long bored = 0;
        long noFace = 0;

        List<TimelineBucketDto> timeline = new ArrayList<>();
        List<ReviewCandidate> reviewCandidates = new ArrayList<>();

        for (BucketAggProjection b : buckets) {
            int bIdx = b.getBucketIndex() != null ? b.getBucketIndex() : 0;
            int startSec = bIdx * 10;
            int endSec = (bIdx + 1) * 10;

            long bTotal = b.getTotalSamples() != null ? b.getTotalSamples() : 0;
            long bEngaged = b.getEngagedCount() != null ? b.getEngagedCount() : 0;
            long bInterested = b.getInterestedCount() != null ? b.getInterestedCount() : 0;
            long bNeutral = b.getNeutralCount() != null ? b.getNeutralCount() : 0;
            long bConfused = b.getConfusedCount() != null ? b.getConfusedCount() : 0;
            long bBored = b.getBoredCount() != null ? b.getBoredCount() : 0;
            long bNoFace = b.getNoFaceCount() != null ? b.getNoFaceCount() : 0;

            totalSamples += bTotal;
            engaged += bEngaged;
            interested += bInterested;
            neutral += bNeutral;
            confused += bConfused;
            bored += bBored;
            noFace += bNoFace;

            long valid = bTotal - bNoFace;
            Double bFocus = valid > 0
                    ? Math.round(((double) (bEngaged + bInterested) / valid) * 1000.0) / 10.0
                    : null;

            String dominant = determineDominant(bTotal, valid, bEngaged, bInterested, bNeutral, bConfused, bBored, bNoFace);

            timeline.add(new TimelineBucketDto(
                    bIdx,
                    startSec,
                    endSec,
                    bTotal,
                    bEngaged,
                    bInterested,
                    bConfused,
                    bBored,
                    bNeutral,
                    bNoFace,
                    bFocus,
                    dominant
            ));

            // Đoạn cần xem lại nếu bối rối >= 35% hoặc chán >= 40% (và có ít nhất 3 mẫu)
            if (bTotal >= 3 && ((double) bConfused / bTotal >= 0.35 || (double) bBored / bTotal >= 0.40)) {
                reviewCandidates.add(new ReviewCandidate(bIdx, startSec, endSec, (double) bConfused / bTotal, (double) bBored / bTotal));
            }
        }

        var overallMetrics = reportCalculationService.calculateMetrics(totalSamples, engaged, interested, neutral, confused, bored, noFace);

        // Gom các bucket liền kề thành đoạn đề xuất xem lại
        List<ReviewSegmentDto> reviewSegments = mergeReviewCandidates(reviewCandidates);

        // Gợi ý thích ứng
        List<LearningSession> userSessions = learningSessionRepository.findByUserIdAndContentItemIdOrderByStartTimeDesc(userId, contentItemId);
        List<String> sIds = userSessions.stream().map(LearningSession::getId).toList();
        List<AdaptiveSuggestion> suggestions = sIds.isEmpty() ? List.of() : adaptiveSuggestionRepository.findBySessionIdIn(sIds);
        int sugCount = suggestions.size();
        int acceptedCount = (int) suggestions.stream().filter(s -> Boolean.TRUE.equals(s.getWasAccepted())).count();

        List<String> notes = new ArrayList<>();
        if (!reviewSegments.isEmpty()) {
            notes.add("Hệ thống phát hiện " + reviewSegments.size() + " đoạn video bạn có dấu hiệu bối rối hoặc mất tập trung. Bạn có thể nhấn 'Xem lại đoạn này' để nhảy thẳng đến mốc thời gian đó.");
        } else {
            notes.add("Bạn duy trì mức độ hiểu bài và tập trung rất tốt trong toàn bộ bài giảng này!");
        }
        notes.add("Lưu ý: Mọi chỉ số cảm xúc và sự tập trung được AI ước lượng tự động để gợi ý cá nhân hoá, mang tính chất hỗ trợ học tập.");

        return new StudentLessonEmotionDetailDto(
                contentItemId,
                item.getTitle(),
                item.getCourse() != null ? item.getCourse().getId() : null,
                item.getCourse() != null ? item.getCourse().getTitle() : null,
                videoDuration,
                overallMetrics.hasSufficientData() ? overallMetrics.focusScore() : null,
                overallMetrics.presenceRate(),
                overallMetrics.engagedPercent(),
                overallMetrics.interestedPercent(),
                overallMetrics.confusedPercent(),
                overallMetrics.boredPercent(),
                timeline,
                reviewSegments,
                sugCount,
                acceptedCount,
                notes
        );
    }

    private String determineDominant(long total, long valid, long engaged, long interested, long neutral, long confused, long bored, long noFace) {
        if (total == 0) return "UNKNOWN";
        if ((double) noFace / total >= 0.6) return "NO_FACE";
        if (valid <= 0) return "NO_FACE";

        if ((double) confused / valid >= 0.35) return "CONFUSED";
        if ((double) bored / valid >= 0.40) return "BORED";

        long max = Math.max(engaged, Math.max(interested, Math.max(neutral, Math.max(confused, bored))));
        if (max == engaged) return "ENGAGED";
        if (max == interested) return "INTERESTED";
        if (max == neutral) return "NEUTRAL";
        if (max == confused) return "CONFUSED";
        return "BORED";
    }

    private record ReviewCandidate(int bucketIndex, int startSec, int endSec, double confusedRate, double boredRate) {}

    private List<ReviewSegmentDto> mergeReviewCandidates(List<ReviewCandidate> candidates) {
        if (candidates.isEmpty()) return Collections.emptyList();

        List<ReviewSegmentDto> segments = new ArrayList<>();
        int i = 0;
        while (i < candidates.size()) {
            ReviewCandidate start = candidates.get(i);
            int curEndSec = start.endSec();
            double sumConf = start.confusedRate();
            double sumBored = start.boredRate();
            int count = 1;

            while (i + 1 < candidates.size() && candidates.get(i + 1).bucketIndex() == candidates.get(i).bucketIndex() + 1) {
                i++;
                ReviewCandidate next = candidates.get(i);
                curEndSec = next.endSec();
                sumConf += next.confusedRate();
                sumBored += next.boredRate();
                count++;
            }

            double avgConf = Math.round((sumConf / count) * 1000.0) / 10.0;
            double avgBored = Math.round((sumBored / count) * 1000.0) / 10.0;

            String reason = avgConf >= avgBored
                    ? "Có dấu hiệu bối rối tại đoạn kiến thức này"
                    : "Có dấu hiệu giảm tập trung / mệt mỏi";

            String formattedTime = formatSeconds(start.startSec()) + " - " + formatSeconds(curEndSec);

            segments.add(new ReviewSegmentDto(
                    start.startSec(),
                    curEndSec,
                    formattedTime,
                    reason,
                    avgConf,
                    avgBored
            ));
            i++;
        }
        return segments;
    }

    private String formatSeconds(int totalSec) {
        int m = totalSec / 60;
        int s = totalSec % 60;
        return String.format("%02d:%02d", m, s);
    }

    private int calculateStreak(String userId, LocalDate today) {
        // Lấy các buổi học và lượt làm bài trong 180 ngày gần nhất
        LocalDateTime fromUtc = reportCalculationService.getStartOfDayUtc(today.minusDays(180));
        LocalDateTime toUtc = reportCalculationService.getEndOfDayUtc(today);

        List<LearningSession> sessions = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(userId, fromUtc, toUtc);
        List<Attempt> attempts = attemptRepository.findByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(userId, fromUtc, toUtc);

        Set<LocalDate> activeDates = new HashSet<>();
        for (LearningSession s : sessions) {
            activeDates.add(reportCalculationService.toVnLocalDate(s.getStartTime()));
        }
        for (Attempt a : attempts) {
            if (a.getSubmittedAt() != null) {
                activeDates.add(reportCalculationService.toVnLocalDate(a.getSubmittedAt()));
            }
        }

        LocalDate cur = today;
        // Nếu hôm nay chưa học, kiểm tra hôm qua
        if (!activeDates.contains(cur)) {
            cur = today.minusDays(1);
            if (!activeDates.contains(cur)) {
                return 0;
            }
        }

        int streak = 0;
        while (activeDates.contains(cur)) {
            streak++;
            cur = cur.minusDays(1);
        }
        return streak;
    }

    private List<String> generateHighlights(int streak, Double avgFocus, Double avgPractice, int totalSessions, int totalAttempts) {
        List<String> list = new ArrayList<>();

        if (streak > 1) {
            list.add("Bạn đang duy trì chuỗi học tập " + streak + " ngày liên tiếp! Hãy tiếp tục phát huy tinh thần tuyệt vời này.");
        } else if (streak == 1) {
            list.add("Bạn đã hoàn thành phiên học hôm nay. Hãy học tiếp vào ngày mai để xây dựng chuỗi ngày học tập đều đặn nhé!");
        } else {
            list.add("Hãy hoàn thành một bài học ngay hôm nay để kích hoạt lại chuỗi ngày học tập của bạn.");
        }

        if (avgFocus != null) {
            if (avgFocus >= 75.0) {
                list.add("Điểm tập trung trung bình đạt " + avgFocus + "% — mức độ tiếp thu bài giảng của bạn đang ở trạng thái rất tích cực.");
            } else if (avgFocus >= 50.0) {
                list.add("Điểm tập trung trung bình đạt " + avgFocus + "%. Bạn nên tận dụng các mốc nghỉ ngắn để giữ sự tập trung cao độ.");
            } else {
                list.add("Điểm tập trung đạt " + avgFocus + "%. Hệ thống đề xuất xem lại các đoạn bài giảng được đánh dấu bối rối tại tab Cảm xúc & tập trung.");
            }
        } else {
            list.add("Bật camera trong các buổi học video bài giảng sẽ giúp AI ước lượng sự tập trung và hỗ trợ bạn học tập hiệu quả hơn.");
        }

        if (avgPractice != null && totalAttempts > 0) {
            list.add("Điểm luyện tập trung bình đạt " + avgPractice + "% qua " + totalAttempts + " lượt làm bài.");
        }

        list.add("Lưu ý: Mọi chỉ số cảm xúc và sự tập trung được AI ước lượng tự động để gợi ý cá nhân hoá, mang tính chất hỗ trợ học tập.");

        return list;
    }

    /**
     * Tab 3: Phân tích Luyện tập & Sổ câu sai (Phase R2)
     */
    public StudentPracticeReportDto getPracticeReport(String userId, Integer days, String courseId) {
        LocalDateTime fromUtc = null;
        LocalDateTime toUtc = null;
        if (days != null && days > 0) {
            LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
            fromUtc = reportCalculationService.getStartOfDayUtc(today.minusDays(days - 1));
            toUtc = reportCalculationService.getEndOfDayUtc(today);
        }

        // 1. Phân tích độ chính xác theo Part (Part 1 - 7, Ngữ pháp, Từ vựng...)
        List<AttemptAnswerRepository.PartAccuracyProjection> partProjs =
                attemptAnswerRepository.getPartAccuracy(userId, courseId, fromUtc, toUtc);

        List<PartAccuracyDto> partAccuracies = partProjs.stream().map(p -> {
            String code = p.getSectionCode();
            long total = p.getTotalQuestions() != null ? p.getTotalQuestions() : 0;
            long correct = p.getCorrectCount() != null ? p.getCorrectCount() : 0;
            double rate = total > 0 ? Math.round(((double) correct / total) * 1000.0) / 10.0 : 0.0;
            return new PartAccuracyDto(code, getSectionFriendlyName(code), total, correct, rate);
        }).toList();

        // 2. Phân tích chủ đề yếu (tags có tỷ lệ đúng thấp)
        List<AttemptAnswerRepository.TagAccuracyProjection> tagProjs =
                attemptAnswerRepository.getTagAccuracy(userId, courseId, fromUtc, toUtc);

        List<WeakTagDto> weakTags = tagProjs.stream().map(t -> {
            long total = t.getTotalQuestions() != null ? t.getTotalQuestions() : 0;
            long correct = t.getCorrectCount() != null ? t.getCorrectCount() : 0;
            double rate = total > 0 ? Math.round(((double) correct / total) * 1000.0) / 10.0 : 0.0;
            String status = rate < 60.0 ? "NEED_IMPROVEMENT" : (rate < 80.0 ? "AVERAGE" : "GOOD");
            return new WeakTagDto(t.getTag(), total, correct, rate, status);
        }).toList();

        // 3. Lịch sử làm bài & xu hướng điểm (attempts)
        List<Attempt> completedAttempts = attemptRepository.findCompletedAttemptsByFilter(userId, courseId, fromUtc, toUtc);

        int totalPracticeTests = completedAttempts.size();
        int totalQuestions = 0;
        int totalCorrect = 0;

        List<AttemptHistoryItemDto> recentAttempts = new ArrayList<>();
        for (Attempt a : completedAttempts) {
            int qCount = a.getTotalQuestions() != null ? a.getTotalQuestions() : 0;
            int cCount = a.getCorrectCount() != null ? a.getCorrectCount() : 0;
            totalQuestions += qCount;
            totalCorrect += cCount;

            Long durationSec = null;
            if (a.getStartedAt() != null && a.getSubmittedAt() != null) {
                durationSec = Math.max(0, java.time.Duration.between(a.getStartedAt(), a.getSubmittedAt()).getSeconds());
            }

            recentAttempts.add(new AttemptHistoryItemDto(
                    a.getId(),
                    a.getContentItem() != null ? a.getContentItem().getId() : null,
                    a.getContentItem() != null ? a.getContentItem().getTitle() : null,
                    a.getContentItem() != null && a.getContentItem().getCourse() != null ? a.getContentItem().getCourse().getId() : null,
                    a.getContentItem() != null && a.getContentItem().getCourse() != null ? a.getContentItem().getCourse().getTitle() : null,
                    a.getContentItem() != null ? a.getContentItem().getSectionCode() : null,
                    a.getScore(),
                    qCount,
                    cCount,
                    durationSec,
                    a.getSubmittedAt() != null ? a.getSubmittedAt().format(TIME_FMT) : ""
            ));
        }

        // Xu hướng điểm theo thời gian (sắp xếp tăng dần theo thời gian nộp)
        List<AttemptHistoryItemDto> scoreTrend = new ArrayList<>(recentAttempts);
        Collections.reverse(scoreTrend);

        Double overallAccuracy = totalQuestions > 0
                ? Math.round(((double) totalCorrect / totalQuestions) * 1000.0) / 10.0
                : null;

        // 4. Sổ câu sai (Wrong Answer Notebook)
        List<WrongQuestionItemDto> wrongQuestions = buildWrongQuestions(userId, courseId, null, null);

        return new StudentPracticeReportDto(
                partAccuracies,
                weakTags,
                scoreTrend,
                recentAttempts,
                wrongQuestions,
                totalPracticeTests,
                totalQuestions,
                wrongQuestions.size(),
                overallAccuracy
        );
    }

    /**
     * Lấy danh sách câu sai (Sổ câu sai) có lọc theo Part và Tag
     */
    public List<WrongQuestionItemDto> getWrongQuestions(String userId, String courseId, String sectionCode, String tag) {
        return buildWrongQuestions(userId, courseId, sectionCode, tag);
    }

    private List<WrongQuestionItemDto> buildWrongQuestions(String userId, String courseId, String sectionCode, String tag) {
        List<AttemptAnswer> wrongAnswers = attemptAnswerRepository.findWrongAnswersByUser(userId, courseId, sectionCode, tag);
        if (wrongAnswers.isEmpty()) return Collections.emptyList();

        // Gom theo questionId để tính số lần làm sai và lấy câu trả lời gần nhất
        Map<String, List<AttemptAnswer>> grouped = wrongAnswers.stream()
                .filter(aa -> aa.getQuestion() != null)
                .collect(Collectors.groupingBy(aa -> aa.getQuestion().getId(), LinkedHashMap::new, Collectors.toList()));

        List<String> questionIds = new ArrayList<>(grouped.keySet());
        // Lấy tất cả options của các câu hỏi này để tìm đáp án đúng
        List<AnswerOption> options = answerOptionRepository.findByQuestionIdInOrderByLabelAsc(questionIds);
        Map<String, AnswerOption> correctOptionByQuestion = options.stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                .collect(Collectors.toMap(opt -> opt.getQuestion().getId(), opt -> opt, (o1, o2) -> o1));

        List<WrongQuestionItemDto> result = new ArrayList<>();

        for (Map.Entry<String, List<AttemptAnswer>> entry : grouped.entrySet()) {
            String qId = entry.getKey();
            List<AttemptAnswer> answers = entry.getValue();
            AttemptAnswer latestAnswer = answers.get(0); // Vì ORDER BY aa.createdAt DESC
            Question q = latestAnswer.getQuestion();
            ContentItem ci = latestAnswer.getAttempt() != null ? latestAnswer.getAttempt().getContentItem() : null;

            AnswerOption selectedOpt = latestAnswer.getSelectedOption();
            AnswerOption correctOpt = correctOptionByQuestion.get(qId);

            String imgUrl = (q.getImage() != null) ? q.getImage().getUrl() : null;
            String audUrl = (q.getAudio() != null) ? q.getAudio().getUrl() : null;

            result.add(new WrongQuestionItemDto(
                    qId,
                    q.getPromptText(),
                    q.getQuestionKind(),
                    q.getTag(),
                    ci != null ? ci.getSectionCode() : null,
                    ci != null ? ci.getId() : null,
                    ci != null ? ci.getTitle() : null,
                    (ci != null && ci.getCourse() != null) ? ci.getCourse().getTitle() : null,
                    imgUrl,
                    audUrl,
                    selectedOpt != null ? selectedOpt.getId() : null,
                    selectedOpt != null ? selectedOpt.getLabel() : null,
                    selectedOpt != null ? selectedOpt.getContent() : null,
                    correctOpt != null ? correctOpt.getId() : null,
                    correctOpt != null ? correctOpt.getLabel() : null,
                    correctOpt != null ? correctOpt.getContent() : null,
                    latestAnswer.getSubmittedText(),
                    q.getExplanation(),
                    answers.size(),
                    latestAnswer.getCreatedAt() != null ? latestAnswer.getCreatedAt().format(TIME_FMT) : ""
            ));
        }

        return result;
    }

    public String getSectionFriendlyName(String sectionCode) {
        if (sectionCode == null) return "Bài luyện tập";
        return switch (sectionCode.toUpperCase()) {
            case "PART1" -> "Part 1 - Mô tả tranh";
            case "PART2" -> "Part 2 - Hỏi & Đáp";
            case "PART3" -> "Part 3 - Đoạn hội thoại";
            case "PART4" -> "Part 4 - Bài nói ngắn";
            case "PART5" -> "Part 5 - Hoàn thành câu";
            case "PART6" -> "Part 6 - Hoàn thành đoạn văn";
            case "PART7" -> "Part 7 - Đọc hiểu đoạn văn";
            case "GRAMMAR" -> "Ngữ pháp";
            case "VOCAB" -> "Từ vựng";
            case "DICTATION" -> "Chép chính tả";
            default -> sectionCode;
        };
    }

    /**
     * Tab 4: Thống kê Từ vựng & Spaced Repetition (Phase R3)
     */
    public StudentVocabReportDto getVocabReport(String userId, String courseId) {
        LocalDateTime now = LocalDateTime.now();

        // 1. Lấy danh sách khóa học mà học viên đã ghi danh
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        Set<String> validCourseIds = (courseId != null && !courseId.isBlank())
                ? Set.of(courseId)
                : enrollments.stream().map(e -> e.getCourse().getId()).collect(Collectors.toSet());

        // 2. Lấy tất cả vocab_set_items của các khóa học này
        List<VocabSetItem> allSetItems = vocabSetItemRepository.findAllWithWordAndCourse(courseId);
        List<VocabSetItem> enrolledSetItems = allSetItems.stream()
                .filter(vsi -> vsi.getContentItem() != null && vsi.getContentItem().getCourse() != null
                        && validCourseIds.contains(vsi.getContentItem().getCourse().getId()))
                .toList();

        // 3. Lấy tiến độ FlashcardProgress của học viên
        List<FlashcardProgress> progresses = flashcardProgressRepository.findByUserIdWithMedia(userId);
        Map<String, FlashcardProgress> progressByWordId = progresses.stream()
                .filter(p -> p.getWord() != null)
                .collect(Collectors.toMap(p -> p.getWord().getId(), p -> p, (p1, p2) -> p1));

        // Gom các từ vựng duy nhất
        Map<String, VocabWord> uniqueWords = new LinkedHashMap<>();
        for (VocabSetItem vsi : enrolledSetItems) {
            if (vsi.getWord() != null) {
                uniqueWords.putIfAbsent(vsi.getWord().getId(), vsi.getWord());
            }
        }

        // Bổ sung các từ học viên đã học qua Flashcard
        for (FlashcardProgress p : progresses) {
            if (p.getWord() != null) {
                uniqueWords.putIfAbsent(p.getWord().getId(), p.getWord());
            }
        }

        int totalWords = uniqueWords.size();
        int masteredWords = 0;
        int learningWords = 0;
        int newWords = 0;
        int dueForReviewCount = 0;

        for (VocabWord w : uniqueWords.values()) {
            FlashcardProgress fp = progressByWordId.get(w.getId());
            if (fp == null || "NEW".equals(fp.getStatus())) {
                newWords++;
            } else if ("MASTERED".equals(fp.getStatus())) {
                masteredWords++;
            } else {
                learningWords++;
            }

            if (fp != null && fp.getNextReviewAt() != null && !fp.getNextReviewAt().isAfter(now)) {
                dueForReviewCount++;
            }
        }

        int totalLearned = masteredWords + learningWords;
        Double retentionRate = totalLearned > 0
                ? Math.round(((double) masteredWords / totalLearned) * 1000.0) / 10.0
                : 0.0;

        VocabKpiDto kpi = new VocabKpiDto(
                totalWords,
                masteredWords,
                learningWords,
                newWords,
                dueForReviewCount,
                retentionRate
        );

        // 4. Dự báo Spaced Repetition theo mốc thời gian
        int dueToday = 0;
        int dueTomorrow = 0;
        int dueIn3Days = 0;
        int dueIn7Days = 0;
        int dueLater = 0;

        LocalDateTime t1 = now.plusDays(1);
        LocalDateTime t3 = now.plusDays(3);
        LocalDateTime t7 = now.plusDays(7);

        for (FlashcardProgress p : progresses) {
            if (p.getNextReviewAt() == null) continue;
            LocalDateTime nxt = p.getNextReviewAt();
            if (!nxt.isAfter(now)) {
                dueToday++;
            } else if (!nxt.isAfter(t1)) {
                dueTomorrow++;
            } else if (!nxt.isAfter(t3)) {
                dueIn3Days++;
            } else if (!nxt.isAfter(t7)) {
                dueIn7Days++;
            } else {
                dueLater++;
            }
        }

        SpacedRepetitionForecastDto forecast = new SpacedRepetitionForecastDto(
                dueToday,
                dueTomorrow,
                dueIn3Days,
                dueIn7Days,
                dueLater
        );

        // 5. Tiến độ từng Bộ từ vựng (Vocab Sets)
        Map<String, List<VocabSetItem>> itemsBySet = enrolledSetItems.stream()
                .filter(vsi -> vsi.getContentItem() != null)
                .collect(Collectors.groupingBy(vsi -> vsi.getContentItem().getId(), LinkedHashMap::new, Collectors.toList()));

        List<VocabSetProgressDto> setProgresses = new ArrayList<>();
        for (Map.Entry<String, List<VocabSetItem>> entry : itemsBySet.entrySet()) {
            List<VocabSetItem> sItems = entry.getValue();
            ContentItem ci = sItems.get(0).getContentItem();

            int setTotal = sItems.size();
            int setMastered = 0;
            int setLearning = 0;
            int setDue = 0;
            List<String> sampleWords = new ArrayList<>();

            for (VocabSetItem vsi : sItems) {
                VocabWord w = vsi.getWord();
                if (w == null) continue;
                if (sampleWords.size() < 4) {
                    sampleWords.add(w.getWord());
                }

                FlashcardProgress fp = progressByWordId.get(w.getId());
                if (fp != null) {
                    if ("MASTERED".equals(fp.getStatus())) setMastered++;
                    else if ("LEARNING".equals(fp.getStatus())) setLearning++;

                    if (fp.getNextReviewAt() != null && !fp.getNextReviewAt().isAfter(now)) {
                        setDue++;
                    }
                }
            }

            double progressPct = setTotal > 0
                    ? Math.round(((double) setMastered / setTotal) * 1000.0) / 10.0
                    : 0.0;

            setProgresses.add(new VocabSetProgressDto(
                    ci.getId(),
                    ci.getTitle(),
                    ci.getCourse() != null ? ci.getCourse().getId() : null,
                    ci.getCourse() != null ? ci.getCourse().getTitle() : null,
                    setTotal,
                    setMastered,
                    setLearning,
                    setDue,
                    progressPct,
                    sampleWords
            ));
        }

        // 6. Danh sách từ cần ôn tập ngay (Due Words)
        List<FlashcardProgress> dueProgressList = progresses.stream()
                .filter(p -> p.getWord() != null && (p.getNextReviewAt() == null || !p.getNextReviewAt().isAfter(now) || "LEARNING".equals(p.getStatus())))
                .sorted((p1, p2) -> {
                    if (p1.getNextReviewAt() == null) return 1;
                    if (p2.getNextReviewAt() == null) return -1;
                    return p1.getNextReviewAt().compareTo(p2.getNextReviewAt());
                })
                .limit(20)
                .toList();

        List<String> dueWordIds = dueProgressList.stream().map(p -> p.getWord().getId()).toList();
        List<VocabExample> examples = dueWordIds.isEmpty() ? List.of() : vocabExampleRepository.findByWordIdInWithAudio(dueWordIds);
        Map<String, VocabExample> exampleMap = examples.stream()
                .collect(Collectors.toMap(e -> e.getWord().getId(), e -> e, (e1, e2) -> e1));

        List<DueWordItemDto> dueWords = new ArrayList<>();
        LocalDate todayVn = LocalDate.now(ReportCalculationService.VN_ZONE);

        for (FlashcardProgress p : dueProgressList) {
            VocabWord w = p.getWord();
            long daysOverdue = 0;
            if (p.getNextReviewAt() != null) {
                LocalDate reviewDate = reportCalculationService.toVnLocalDate(p.getNextReviewAt());
                daysOverdue = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(reviewDate, todayVn));
            }

            VocabExample ex = exampleMap.get(w.getId());

            String imgUrl = (w.getImage() != null) ? w.getImage().getUrl() : null;
            String ukUrl = (w.getAudioUk() != null) ? w.getAudioUk().getUrl() : null;
            String usUrl = (w.getAudioUs() != null) ? w.getAudioUs().getUrl() : null;

            dueWords.add(new DueWordItemDto(
                    w.getId(),
                    w.getWord(),
                    w.getIpa(),
                    w.getPartOfSpeech(),
                    w.getMeaningVi(),
                    ukUrl,
                    usUrl,
                    imgUrl,
                    p.getStatus(),
                    p.getNextReviewAt() != null ? p.getNextReviewAt().format(TIME_FMT) : "Chưa có lịch",
                    daysOverdue,
                    ex != null ? ex.getSentenceEn() : null,
                    ex != null ? ex.getSentenceVi() : null
            ));
        }

        return new StudentVocabReportDto(kpi, forecast, setProgresses, dueWords);
    }
}


