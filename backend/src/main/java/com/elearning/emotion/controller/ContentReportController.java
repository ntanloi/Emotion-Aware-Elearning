package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ContentReportDto;
import com.elearning.emotion.dto.CreateContentReportRequest;
import com.elearning.emotion.service.ContentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ContentReportController {

    private final ContentReportService contentReportService;

    @PostMapping
    public ResponseEntity<ContentReportDto> submitReport(
            @AuthenticationPrincipal String reporterId,
            @Valid @RequestBody CreateContentReportRequest req) {
        if (reporterId == null) {
            throw new IllegalArgumentException("Vui lòng đăng nhập để gửi báo cáo vi phạm");
        }
        return ResponseEntity.ok(contentReportService.submitReport(reporterId, req));
    }
}
