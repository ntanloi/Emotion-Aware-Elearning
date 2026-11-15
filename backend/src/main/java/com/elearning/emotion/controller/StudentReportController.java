package com.elearning.emotion.controller;

import com.elearning.emotion.dto.report.StudentLessonEmotionDetailDto;
import com.elearning.emotion.dto.report.StudentLessonEmotionSummaryDto;
import com.elearning.emotion.dto.report.StudentReportOverviewDto;
import com.elearning.emotion.service.report.StudentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/reports")
@RequiredArgsConstructor
public class StudentReportController {

    private final StudentReportService studentReportService;

    /**
     * Tab 1: Tổng quan (KPI cards, biểu đồ hoạt động theo ngày, nhận xét nổi bật)
     */
    @GetMapping("/overview")
    public StudentReportOverviewDto getOverview(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) String courseId
    ) {
        return studentReportService.getOverview(userId, days, courseId);
    }

    /**
     * Tab 2: Danh sách video bài giảng kèm cảm xúc & độ tập trung
     */
    @GetMapping("/emotions/lessons")
    public List<StudentLessonEmotionSummaryDto> getLessonEmotionSummaries(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) String courseId
    ) {
        return studentReportService.getLessonEmotionSummaries(userId, days, courseId);
    }

    /**
     * Tab 2: Chi tiết timeline cảm xúc 10s và các đoạn kiến nghị xem lại của bài học
     */
    @GetMapping("/emotions/lessons/{contentItemId}")
    public StudentLessonEmotionDetailDto getLessonEmotionDetail(
            @AuthenticationPrincipal String userId,
            @PathVariable String contentItemId
    ) {
        return studentReportService.getLessonEmotionDetail(userId, contentItemId);
    }

    /**
     * Tab 3: Báo cáo phân tích Luyện tập & Sổ câu sai (Phase R2)
     */
    @GetMapping("/practice")
    public com.elearning.emotion.dto.report.StudentPracticeReportDto getPracticeReport(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) String courseId
    ) {
        return studentReportService.getPracticeReport(userId, days, courseId);
    }

    /**
     * Sổ câu sai: danh sách câu hỏi làm sai có bộ lọc theo Part hoặc Tag
     */
    @GetMapping("/wrong-questions")
    public List<com.elearning.emotion.dto.report.WrongQuestionItemDto> getWrongQuestions(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String sectionCode,
            @RequestParam(required = false) String tag
    ) {
        return studentReportService.getWrongQuestions(userId, courseId, sectionCode, tag);
    }

    /**
     * Tab 4: Báo cáo Từ vựng & Spaced Repetition (Phase R3)
     */
    @GetMapping("/vocab")
    public com.elearning.emotion.dto.report.StudentVocabReportDto getVocabReport(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String courseId
    ) {
        return studentReportService.getVocabReport(userId, courseId);
    }
}


