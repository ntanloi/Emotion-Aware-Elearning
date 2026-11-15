package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ReviewReportRequest;
import com.elearning.emotion.service.CourseReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller tiếp nhận báo cáo vi phạm đánh giá hoặc hình ảnh từ người dùng (Phase 3)
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewReportController {

    private final CourseReviewService courseReviewService;

    @PostMapping("/{id}/report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> reportReview(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @Valid @RequestBody ReviewReportRequest req
    ) {
        courseReviewService.reportReview(userId, id, req);
        return ResponseEntity.ok(Map.of("message", "Báo cáo vi phạm đã được gửi thành công. Quản trị viên sẽ sớm xem xét."));
    }
}
