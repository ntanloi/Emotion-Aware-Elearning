package com.elearning.emotion.controller;

import com.elearning.emotion.dto.moderation.AdminModerationReportDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionRequest;
import com.elearning.emotion.moderation.engine.CourseReadinessService;
import com.elearning.emotion.moderation.model.ReadinessReportDto;
import com.elearning.emotion.service.AdminModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;
    private final CourseReadinessService courseReadinessService;

    /**
     * Lấy báo cáo kiểm duyệt mới nhất kèm danh sách issues và quyết định của kiểm duyệt viên
     */
    @GetMapping("/courses/{id}/moderation")
    public ResponseEntity<AdminModerationReportDto> getCourseModerationReport(@PathVariable String id) {
        return ResponseEntity.ok(adminModerationService.getCourseModerationReport(id));
    }

    /**
     * Lấy báo cáo điều kiện gửi duyệt (Readiness) của khóa học
     */
    @GetMapping("/courses/{id}/readiness")
    public ResponseEntity<ReadinessReportDto> getCourseReadiness(@PathVariable String id) {
        return ResponseEntity.ok(courseReadinessService.checkReadiness(id, null));
    }

    /**
     * Kiểm duyệt viên đưa ra quyết định cho một issue (ACCEPT | DISMISS | NEED_FIX)
     */
    @PutMapping("/moderation/issues/{issueId}/decision")
    public ResponseEntity<ModerationDecisionDto> updateIssueDecision(
            @AuthenticationPrincipal String adminId,
            @PathVariable String issueId,
            @RequestBody ModerationDecisionRequest req) {
        return ResponseEntity.ok(adminModerationService.updateIssueDecision(adminId, issueId, req));
    }

    /**
     * Thống kê độ chính xác thực tế của cảnh báo theo từng rule (tỷ lệ ACCEPT vs DISMISS)
     */
    @GetMapping("/moderation/stats/rules")
    public ResponseEntity<java.util.List<com.elearning.emotion.dto.moderation.RuleAccuracyStatsDto>> getRuleAccuracyStats() {
        return ResponseEntity.ok(adminModerationService.getRuleAccuracyStats());
    }

    /**
     * Yêu cầu chạy lại phân tích kiểm duyệt (Re-analyze) bất đồng bộ
     */
    @PostMapping("/courses/{id}/moderation/re-analyze")
    public ResponseEntity<AdminModerationReportDto> reanalyzeCourse(@PathVariable String id) {
        return ResponseEntity.ok(adminModerationService.reanalyzeCourse(id));
    }
}
