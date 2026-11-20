package com.elearning.emotion.service.report;

import com.elearning.emotion.dto.report.WrongQuestionItemDto;
import com.elearning.emotion.entity.Attempt;
import com.elearning.emotion.entity.DailyReport;
import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.AttemptRepository;
import com.elearning.emotion.repository.DailyReportRepository;
import com.elearning.emotion.repository.LearningSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExportService {

    private final LearningSessionRepository learningSessionRepository;
    private final AttemptRepository attemptRepository;
    private final DailyReportRepository dailyReportRepository;
    private final StudentReportService studentReportService;
    private final ReportCalculationService reportCalculationService;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Xuất danh sách nhật ký học tập (Video + Luyện tập) ra định dạng CSV chuẩn UTF-8
     */
    @Transactional(readOnly = true)
    public byte[] exportActivityCsv(String userId, Integer days, String courseId) {
        LocalDateTime fromUtc = null;
        LocalDateTime toUtc = null;
        if (days != null && days > 0) {
            LocalDate toDate = LocalDate.now(ReportCalculationService.VN_ZONE);
            LocalDate fromDate = toDate.minusDays(days - 1);
            fromUtc = reportCalculationService.getStartOfDayUtc(fromDate);
            toUtc = reportCalculationService.getEndOfDayUtc(toDate);
        }

        // 1. Lấy dữ liệu Video sessions
        List<LearningSession> sessions;
        if (fromUtc != null && toUtc != null) {
            sessions = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(userId, fromUtc, toUtc);
        } else {
            sessions = learningSessionRepository.findByUserIdOrderByStartTimeDesc(userId);
        }
        if (courseId != null && !courseId.isBlank()) {
            sessions = sessions.stream()
                    .filter(s -> s.getContentItem() != null
                            && s.getContentItem().getCourse() != null
                            && courseId.equals(s.getContentItem().getCourse().getId()))
                    .toList();
        }

        // 2. Lấy dữ liệu Attempts
        List<Attempt> attempts = attemptRepository.findCompletedAttemptsByFilter(userId, courseId, fromUtc, toUtc);

        // 3. Ghép vào danh sách hàng chung
        record ActivityRow(LocalDateTime time, String type, String title, String courseTitle,
                           double durationMinutes, String focusScore, String practiceScore) {}

        List<ActivityRow> rows = new ArrayList<>();
        for (LearningSession s : sessions) {
            LocalDateTime vnTime = s.getStartTime() != null
                    ? s.getStartTime()
                    : LocalDateTime.now(ReportCalculationService.VN_ZONE);
            long sec = reportCalculationService.getEffectiveStudySeconds(s);
            double minutes = Math.round((sec / 60.0) * 10.0) / 10.0;
            String focusStr = s.getFocusScore() != null ? String.valueOf(s.getFocusScore()) : "";
            String courseTitle = s.getContentItem().getCourse() != null ? s.getContentItem().getCourse().getTitle() : "";
            rows.add(new ActivityRow(vnTime, "Video bài giảng", s.getContentItem().getTitle(), courseTitle, minutes, focusStr, ""));
        }

        for (Attempt a : attempts) {
            LocalDateTime vnTime = a.getSubmittedAt() != null
                    ? a.getSubmittedAt()
                    : LocalDateTime.now(ReportCalculationService.VN_ZONE);
            double minutes = 0.0;
            if (a.getStartedAt() != null && a.getSubmittedAt() != null) {
                long durationSec = Math.max(0, java.time.Duration.between(a.getStartedAt(), a.getSubmittedAt()).getSeconds());
                minutes = Math.round((durationSec / 60.0) * 10.0) / 10.0;
            }
            String scoreStr = a.getScore() != null ? String.valueOf(a.getScore()) : "";
            String courseTitle = a.getContentItem().getCourse() != null ? a.getContentItem().getCourse().getTitle() : "";
            rows.add(new ActivityRow(vnTime, "Bài kiểm tra/Luyện tập", a.getContentItem().getTitle(), courseTitle, minutes, "", scoreStr));
        }

        rows.sort((r1, r2) -> r2.time().compareTo(r1.time()));

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF'); // Byte Order Mark cho UTF-8 Excel
        sb.append("Thời gian,Loại hoạt động,Tên bài học/bài thi,Khóa học,Thời lượng (phút),Điểm tập trung (%),Điểm bài tập (%)\n");

        for (ActivityRow r : rows) {
            sb.append(escapeCsv(r.time().format(DATE_TIME_FMT))).append(",");
            sb.append(escapeCsv(r.type())).append(",");
            sb.append(escapeCsv(r.title())).append(",");
            sb.append(escapeCsv(r.courseTitle())).append(",");
            sb.append(r.durationMinutes()).append(",");
            sb.append(escapeCsv(r.focusScore())).append(",");
            sb.append(escapeCsv(r.practiceScore())).append("\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Xuất Sổ câu sai ra file CSV
     */
    @Transactional(readOnly = true)
    public byte[] exportWrongQuestionsCsv(String userId, String courseId) {
        List<WrongQuestionItemDto> list = studentReportService.getWrongQuestions(userId, courseId, null, null);

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Thời gian làm,Khóa học,Tên bài kiểm tra,Phần thi / Nhãn,Nội dung câu hỏi,Đáp án bạn chọn,Đáp án đúng,Giải thích chi tiết\n");

        for (WrongQuestionItemDto q : list) {
            String selected = q.selectedOptionLabel() != null
                    ? (q.selectedOptionLabel() + ": " + (q.selectedOptionContent() != null ? q.selectedOptionContent() : ""))
                    : (q.submittedText() != null ? q.submittedText() : "");
            String correct = q.correctOptionLabel() != null
                    ? (q.correctOptionLabel() + ": " + (q.correctOptionContent() != null ? q.correctOptionContent() : ""))
                    : "";

            sb.append(escapeCsv(q.lastAttemptedAt())).append(",");
            sb.append(escapeCsv(q.courseTitle())).append(",");
            sb.append(escapeCsv(q.contentItemTitle())).append(",");
            sb.append(escapeCsv(q.sectionCode() != null ? q.sectionCode() : q.tag())).append(",");
            sb.append(escapeCsv(q.promptText())).append(",");
            sb.append(escapeCsv(selected)).append(",");
            sb.append(escapeCsv(correct)).append(",");
            sb.append(escapeCsv(q.explanation())).append("\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Xuất Nhật ký báo cáo ngày ra file CSV
     */
    @Transactional(readOnly = true)
    public byte[] exportDailyReportsCsv(String userId) {
        List<DailyReport> reports = dailyReportRepository.findByUserIdOrderByReportDateDesc(userId);

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Ngày báo cáo,Trạng thái,Thời lượng học (phút),Số buổi học,Điểm tập trung (%),Điểm luyện tập (%),Tổng hợp cảm xúc,Lời khuyên sư phạm AI\n");

        for (DailyReport r : reports) {
            String studyMin = "";
            String sessionsCount = "";
            String avgFocus = "";
            String avgPractice = "";

            if (r.getMetrics() != null) {
                try {
                    JsonNode node = objectMapper.readTree(r.getMetrics());
                    if (node.hasNonNull("studySeconds")) {
                        studyMin = String.valueOf(Math.round(node.get("studySeconds").asLong() / 60.0));
                    }
                    if (node.hasNonNull("sessionsCount")) {
                        sessionsCount = node.get("sessionsCount").asText();
                    }
                    if (node.hasNonNull("avgFocusScore")) {
                        avgFocus = node.get("avgFocusScore").asText();
                    }
                    if (node.hasNonNull("avgPracticeScore")) {
                        avgPractice = node.get("avgPracticeScore").asText();
                    }
                } catch (Exception ignored) {}
            }

            sb.append(escapeCsv(r.getReportDate() != null ? r.getReportDate().format(DATE_FMT) : "")).append(",");
            sb.append(escapeCsv(r.getStatus())).append(",");
            sb.append(escapeCsv(studyMin)).append(",");
            sb.append(escapeCsv(sessionsCount)).append(",");
            sb.append(escapeCsv(avgFocus)).append(",");
            sb.append(escapeCsv(avgPractice)).append(",");
            sb.append(escapeCsv(r.getEmotionSummary())).append(",");
            sb.append(escapeCsv(r.getAiAdviceText())).append("\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        String clean = value.replace("\r\n", " ").replace("\n", " ").replace("\r", " ");
        if (clean.contains(",") || clean.contains("\"") || clean.contains(";")) {
            return "\"" + clean.replace("\"", "\"\"") + "\"";
        }
        return clean;
    }
}
