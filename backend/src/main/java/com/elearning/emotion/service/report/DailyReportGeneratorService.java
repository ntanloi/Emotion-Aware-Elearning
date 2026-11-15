package com.elearning.emotion.service.report;

import com.elearning.emotion.dto.report.DailyReportResponseDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.repository.SessionBucketStatsRepository.BucketAggProjection;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyReportGeneratorService {

    private final DailyReportRepository dailyReportRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final AttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final ReportCalculationService reportCalculationService;
    private final ObjectMapper objectMapper;
    private final DailyAdviceService adviceService;
    private final StudentReportService studentReportService;

    /** Báo cáo có nguồn "RULE" (LLM lỗi/tắt) sẽ được thử sinh lại bằng AI sau khoảng này. */
    private static final long RETRY_RULE_REPORT_AFTER_MINUTES = 10;

    /**
     * Tạo hoặc làm mới Báo cáo ngày cho 1 học viên vào ngày chỉ định.
     * - Ngày HÔM NAY mà chưa học gì: vẫn tạo báo cáo (noActivity = true) kèm lộ trình gợi ý bài nên học.
     * - Ngày quá khứ không có hoạt động: không có báo cáo (xoá bản cũ nếu có) như trước đây.
     * - Có cache theo "dấu vân tay" hoạt động: không gọi LLM lại nếu dữ liệu không đổi.
     */
    @Transactional
    public DailyReportResponseDto generateDailyReportForUser(String userId, LocalDate date) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + userId));

        LocalDate todayVn = LocalDate.now(ReportCalculationService.VN_ZONE);
        LocalDateTime fromUtc = reportCalculationService.getStartOfDayUtc(date);
        LocalDateTime toUtc = reportCalculationService.getEndOfDayUtc(date);

        List<LearningSession> sessions = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(userId, fromUtc, toUtc);
        List<Attempt> attempts = attemptRepository.findByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(userId, fromUtc, toUtc);

        boolean noActivity = sessions.isEmpty() && attempts.isEmpty();
        if (noActivity && !date.equals(todayVn)) {
            log.info("Học viên {} không có hoạt động trong ngày {}", userId, date);
            dailyReportRepository.findByUserIdAndReportDate(userId, date).ifPresent(dailyReportRepository::delete);
            return null;
        }

        long studySeconds = sessions.stream().mapToLong(reportCalculationService::getEffectiveStudySeconds).sum();
        int sessionsCount = sessions.size();
        int attemptsCount = attempts.size();

        // ---- Cache: dữ liệu không đổi thì giữ nguyên báo cáo, không gọi LLM ----
        String fingerprint = noActivity ? "none" : sessionsCount + "|" + attemptsCount + "|" + (studySeconds / 30);
        DailyReport existing = dailyReportRepository.findByUserIdAndReportDate(userId, date).orElse(null);
        if (existing != null && existing.getMetrics() != null) {
            try {
                var old = objectMapper.readTree(existing.getMetrics());
                boolean sameData = fingerprint.equals(old.path("fingerprint").asText(""));
                boolean aiDone = "AI".equals(old.path("adviceSource").asText(""));
                boolean ruleFresh = existing.getUpdatedAt() != null && existing.getUpdatedAt()
                        .isAfter(LocalDateTime.now().minusMinutes(RETRY_RULE_REPORT_AFTER_MINUTES));
                if (sameData && (aiDone || ruleFresh || !adviceService.isLlmAvailable())) {
                    return DailyReportResponseDto.from(existing);
                }
            } catch (Exception ignore) { /* metrics cũ lỗi -> sinh lại */ }
        }

        List<Float> validFocusList = sessions.stream().map(LearningSession::getFocusScore).filter(Objects::nonNull).toList();
        Double avgFocusScore = validFocusList.isEmpty() ? null
                : Math.round(validFocusList.stream().mapToDouble(Float::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

        List<Float> attemptScores = attempts.stream().map(Attempt::getScore).filter(Objects::nonNull).toList();
        Double avgPracticeScore = attemptScores.isEmpty() ? null
                : Math.round(attemptScores.stream().mapToDouble(Float::doubleValue).average().orElse(0.0) * 10.0) / 10.0;

        // Tổng hợp mẫu cảm xúc từ session_bucket_stats (cộng dồn + chi tiết từng bài)
        long totalSamples = 0, engaged = 0, interested = 0, neutral = 0, confused = 0, bored = 0, noFace = 0;
        List<DailyAdviceService.LessonFact> lessonFacts = new ArrayList<>();
        boolean reviewSuggested = false;

        for (LearningSession s : sessions) {
            var totals = sessionBucketStatsRepository.getTotalsBySessionId(s.getId());
            Double lConfused = null, lBored = null;
            if (totals != null) {
                totalSamples += totals.getTotal() != null ? totals.getTotal() : 0;
                engaged += totals.getEngaged() != null ? totals.getEngaged() : 0;
                interested += totals.getInterested() != null ? totals.getInterested() : 0;
                neutral += totals.getNeutral() != null ? totals.getNeutral() : 0;
                confused += totals.getConfused() != null ? totals.getConfused() : 0;
                bored += totals.getBored() != null ? totals.getBored() : 0;
                noFace += totals.getNoFace() != null ? totals.getNoFace() : 0;
                var lm = reportCalculationService.calculateMetrics(totals);
                if (lm.hasSufficientData()) { lConfused = lm.confusedPercent(); lBored = lm.boredPercent(); }
            }
            lessonFacts.add(new DailyAdviceService.LessonFact(
                    s.getContentItem().getTitle(),
                    studentReportService.getSectionFriendlyName(s.getContentItem().getSectionCode()),
                    reportCalculationService.getEffectiveStudySeconds(s) / 60,
                    s.getFocusScore() == null ? null : (double) s.getFocusScore(),
                    lConfused, lBored));
        }

        var emotionMetrics = reportCalculationService.calculateMetrics(totalSamples, engaged, interested, neutral, confused, bored, noFace);
        if (totalSamples >= 30 && (emotionMetrics.confusedPercent() >= 25 || emotionMetrics.boredPercent() >= 30)) {
            reviewSuggested = true;
        }

        String topLessonTitle = sessions.isEmpty() ? null : sessions.get(0).getContentItem().getTitle();

        // ---- Lời khuyên: LLM (có fallback theo luật) dựa trên số liệu thật + tiến trình + điểm yếu ----
        var facts = new DailyAdviceService.TodayFacts(date, !noActivity, (int) (studySeconds / 60), sessionsCount, attemptsCount,
                avgFocusScore, avgPracticeScore, emotionMetrics.confusedPercent(), emotionMetrics.boredPercent(), lessonFacts);
        DailyAdviceService.Advice advice = adviceService.build(userId, facts);

        // ---- Tóm tắt (số liệu thực tế, không dùng LLM) ----
        StringBuilder summary = new StringBuilder();
        if (noActivity) {
            summary.append("Hôm nay (").append(date.getDayOfMonth()).append("/").append(date.getMonthValue())
                    .append(") bạn chưa học video hay làm bài luyện tập nào.");
        } else if (sessionsCount > 0) {
            summary.append("Hôm nay bạn đã học ").append(sessionsCount).append(" buổi video (")
                    .append(studySeconds / 60).append(" phút)");
            summary.append(attemptsCount > 0 ? " và hoàn thành " + attemptsCount + " bài luyện tập." : ".");
            if (avgFocusScore != null) summary.append(" Điểm tập trung trung bình đạt ").append(avgFocusScore).append("%.");
            if (emotionMetrics.confusedPercent() >= 20) {
                summary.append(" Hệ thống nhận thấy bạn có dấu hiệu bối rối (").append(emotionMetrics.confusedPercent())
                        .append("%) ở một số nội dung mới.");
            }
        } else {
            summary.append("Hôm nay bạn đã hoàn thành ").append(attemptsCount).append(" bài kiểm tra luyện tập")
                    .append(avgPracticeScore != null ? (" với điểm trung bình " + avgPracticeScore + "%.") : ".");
        }
        if (advice.summaryExtra() != null && !advice.summaryExtra().isBlank()) {
            summary.append(" ").append(advice.summaryExtra());
        }

        // ---- Metrics JSON ----
        Map<String, Object> metricsMap = new LinkedHashMap<>();
        metricsMap.put("noActivity", noActivity);
        metricsMap.put("fingerprint", fingerprint);
        metricsMap.put("studySeconds", studySeconds);
        metricsMap.put("sessionsCount", sessionsCount);
        metricsMap.put("attemptsCount", attemptsCount);
        metricsMap.put("avgFocusScore", avgFocusScore);
        metricsMap.put("presenceRate", emotionMetrics.presenceRate());
        metricsMap.put("engagedPercent", emotionMetrics.engagedPercent());
        metricsMap.put("interestedPercent", emotionMetrics.interestedPercent());
        metricsMap.put("confusedPercent", emotionMetrics.confusedPercent());
        metricsMap.put("boredPercent", emotionMetrics.boredPercent());
        metricsMap.put("avgPracticeScore", avgPracticeScore);
        metricsMap.put("topLessonTitle", topLessonTitle);
        metricsMap.put("reviewSuggested", reviewSuggested);
        metricsMap.put("adviceSource", advice.source());          // "AI" | "RULE"
        metricsMap.put("nextSteps", advice.plan());               // [{itemId,title,section,reason}]

        String metricsJson = null;
        try {
            metricsJson = objectMapper.writeValueAsString(metricsMap);
        } catch (Exception e) {
            log.error("Lỗi chuyển đổi metrics sang JSON: {}", e.getMessage());
        }

        DailyReport report = existing != null ? existing : DailyReport.builder().user(user).reportDate(date).build();
        report.setStatus("DA_TAO");
        report.setEmotionSummary(summary.toString());
        report.setAiAdviceText(advice.text());
        report.setMetrics(metricsJson);

        DailyReport saved = dailyReportRepository.save(report);
        log.info("Đã tạo báo cáo ngày {} cho học viên {} (noActivity={}, nguồn lời khuyên={})", date, userId, noActivity, advice.source());
        return DailyReportResponseDto.from(saved);
    }

    /**
     * Tạo báo cáo ngày hàng loạt cho tất cả học viên có hoạt động hôm nay (dùng cho Cron Job)
     */
    @Transactional
    public int generateTodayReportsForAllActiveStudents() {
        LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
        LocalDateTime fromUtc = reportCalculationService.getStartOfDayUtc(today);
        LocalDateTime toUtc = reportCalculationService.getEndOfDayUtc(today);

        Set<String> activeUserIds = new HashSet<>();
        activeUserIds.addAll(learningSessionRepository.findActiveUserIdsBetween(fromUtc, toUtc));
        activeUserIds.addAll(attemptRepository.findActiveUserIdsBetween(fromUtc, toUtc));

        int count = 0;
        for (String uId : activeUserIds) {
            try {
                var res = generateDailyReportForUser(uId, today);
                if (res != null) count++;
            } catch (Exception e) {
                log.error("Lỗi tạo báo cáo ngày cho học viên {}: {}", uId, e.getMessage());
            }
        }
        log.info("Cron Job DailyReport: Hoàn thành tạo {} báo cáo ngày {}", count, today);
        return count;
    }

    /**
     * Đánh dấu báo cáo ngày là ĐÃ XEM
     */
    @Transactional
    public DailyReportResponseDto markAsRead(String reportId, String userId) {
        DailyReport report = dailyReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo cáo: " + reportId));

        if (!report.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền xem báo cáo này");
        }

        report.setStatus("DA_XEM");
        return DailyReportResponseDto.from(dailyReportRepository.save(report));
    }
}