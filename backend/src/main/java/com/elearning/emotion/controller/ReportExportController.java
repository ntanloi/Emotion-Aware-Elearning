package com.elearning.emotion.controller;

import com.elearning.emotion.service.report.ReportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/reports/export")
@RequiredArgsConstructor
public class ReportExportController {

    private final ReportExportService reportExportService;

    /**
     * Xuất file CSV nhật ký học tập (Video + Kiểm tra)
     */
    @GetMapping("/activity.csv")
    public ResponseEntity<byte[]> exportActivityCsv(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) String courseId
    ) {
        byte[] csvData = reportExportService.exportActivityCsv(userId, days, courseId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"nhat-ky-hoc-tap.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    /**
     * Xuất file CSV danh sách sổ câu sai
     */
    @GetMapping("/wrong-questions.csv")
    public ResponseEntity<byte[]> exportWrongQuestionsCsv(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String courseId
    ) {
        byte[] csvData = reportExportService.exportWrongQuestionsCsv(userId, courseId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"so-cau-sai.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    /**
     * Xuất file CSV danh sách nhật ký báo cáo ngày
     */
    @GetMapping("/daily-reports.csv")
    public ResponseEntity<byte[]> exportDailyReportsCsv(
            @AuthenticationPrincipal String userId
    ) {
        byte[] csvData = reportExportService.exportDailyReportsCsv(userId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"nhat-ky-bao-cao-ngay.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }
}
