package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ContentReportDto;
import com.elearning.emotion.dto.HandleReportRequest;
import com.elearning.emotion.service.ContentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('MODERATOR')")
@RequiredArgsConstructor
public class AdminReportController {

    private final ContentReportService contentReportService;

    @GetMapping
    public ResponseEntity<Page<ContentReportDto>> getReports(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(contentReportService.getReports(status, page, size));
    }

    @PutMapping("/{id}/action")
    public ResponseEntity<ContentReportDto> handleReport(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @Valid @RequestBody HandleReportRequest req) {
        return ResponseEntity.ok(contentReportService.handleReport(adminId, id, req));
    }
}
