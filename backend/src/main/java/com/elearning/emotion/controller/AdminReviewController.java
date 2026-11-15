package com.elearning.emotion.controller;

import com.elearning.emotion.dto.AdminHideReviewRequest;
import com.elearning.emotion.dto.AdminResolveReportRequest;
import com.elearning.emotion.dto.AdminReviewDto;
import com.elearning.emotion.service.AdminReviewModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final AdminReviewModerationService adminReviewModerationService;

    @GetMapping
    public Map<String, Object> listReviews(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "15") int size
    ) {
        return adminReviewModerationService.listReviews(status, courseId, search, page, size);
    }

    @GetMapping("/reports")
    public Map<String, Object> listReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "15") int size
    ) {
        return adminReviewModerationService.listReports(status, page, size);
    }

    @PatchMapping("/{id}/hide")
    public AdminReviewDto hideReview(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @Valid @RequestBody AdminHideReviewRequest req
    ) {
        return adminReviewModerationService.hideReview(adminId, id, req.reason());
    }

    @PatchMapping("/{id}/restore")
    public AdminReviewDto restoreReview(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id
    ) {
        return adminReviewModerationService.restoreReview(adminId, id);
    }

    @PatchMapping("/images/{imageId}/hide")
    public ResponseEntity<Void> hideImage(
            @AuthenticationPrincipal String adminId,
            @PathVariable String imageId,
            @Valid @RequestBody AdminHideReviewRequest req
    ) {
        adminReviewModerationService.hideReviewImage(adminId, imageId, req.reason());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/images/{imageId}/restore")
    public ResponseEntity<Void> restoreImage(
            @AuthenticationPrincipal String adminId,
            @PathVariable String imageId
    ) {
        adminReviewModerationService.restoreReviewImage(adminId, imageId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/reports/{reportId}/resolve")
    public ResponseEntity<Void> resolveReport(
            @AuthenticationPrincipal String adminId,
            @PathVariable String reportId,
            @Valid @RequestBody AdminResolveReportRequest req
    ) {
        adminReviewModerationService.resolveReport(adminId, reportId, req.action(), req.resolutionNote());
        return ResponseEntity.ok().build();
    }
}
