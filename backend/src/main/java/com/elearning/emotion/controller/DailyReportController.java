package com.elearning.emotion.controller;

import com.elearning.emotion.dto.report.DailyReportResponseDto;
import com.elearning.emotion.repository.DailyReportRepository;
import com.elearning.emotion.service.report.DailyReportGeneratorService;
import com.elearning.emotion.service.report.ReportCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/daily-reports")
@RequiredArgsConstructor
public class DailyReportController {

    private final DailyReportRepository dailyReportRepository;
    private final DailyReportGeneratorService dailyReportGeneratorService;

    @GetMapping("/mine")
    public List<DailyReportResponseDto> getMyDailyReports(@AuthenticationPrincipal String userId) {
        LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
        dailyReportGeneratorService.generateDailyReportForUser(userId, today);
        dailyReportGeneratorService.generateDailyReportForUser(userId, today.minusDays(1));

        return dailyReportRepository.findByUserIdOrderByReportDateDesc(userId)
                .stream()
                .map(DailyReportResponseDto::from)
                .toList();
    }

    @PostMapping("/generate-today")
    public ResponseEntity<DailyReportResponseDto> generateTodayReport(@AuthenticationPrincipal String userId) {
        LocalDate today = LocalDate.now(ReportCalculationService.VN_ZONE);
        DailyReportResponseDto report = dailyReportGeneratorService.generateDailyReportForUser(userId, today);
        dailyReportGeneratorService.generateDailyReportForUser(userId, today.minusDays(1));
        if (report == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(report);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<DailyReportResponseDto> markAsRead(
            @PathVariable String id,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(dailyReportGeneratorService.markAsRead(id, userId));
    }
}
