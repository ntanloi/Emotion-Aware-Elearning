package com.elearning.emotion.controller;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.repository.AuditLogRepository;
import com.elearning.emotion.service.AdminService;
import com.elearning.emotion.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final CourseService courseService;
    private final AuditLogRepository auditLogRepository;

    /** Số liệu chỉ dành cho Quản trị viên, Kiểm duyệt viên không được xem (người dùng, doanh thu/đơn hàng). */
    private static final Set<String> ADMIN_ONLY_STAT_KEYS =
            Set.of("totalStudents", "totalTeachers", "totalEnrollments", "totalOrders");

    private static boolean hasAdminRole(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    // 1. Quản lý người dùng (Học viên & Giảng viên)
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AdminUserDto>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getUsers(role, status, q, page, size));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminUserDto> updateUserStatus(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(adminService.updateUserStatus(adminId, id, status, reason));
    }

    /** Tạo tài khoản Kiểm duyệt viên (chỉ ADMIN). */
    @PostMapping("/moderators")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminUserDto> createModerator(
            @AuthenticationPrincipal String adminId,
            @Valid @RequestBody CreateModeratorRequest req) {
        return ResponseEntity.ok(adminService.createModerator(adminId, req));
    }

    @GetMapping("/teachers/pending")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<List<AdminUserDto>> getPendingTeachers() {
        return ResponseEntity.ok(adminService.getPendingTeachers());
    }

    @PostMapping("/teachers/{id}/approve")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminUserDto> approveTeacher(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        return ResponseEntity.ok(adminService.approveTeacher(adminId, id));
    }

    @PostMapping("/teachers/{id}/reject")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminUserDto> rejectTeacher(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(adminService.rejectTeacher(adminId, id, reason));
    }

    // 2. Quản lý & duyệt khóa học
    @GetMapping("/courses")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Page<AdminCourseDto>> getCourses(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String teacherId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getCourses(status, teacherId, q, sort, page, size));
    }

    @GetMapping("/courses/{id}/review")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, Object>> getCourseReviewDetails(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getCourseReviewDetails(id));
    }

    // P1-1: Xem toàn bộ cây mục lục nội dung khóa học
    @GetMapping("/courses/{id}/preview")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminCoursePreviewDto> getCoursePreview(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getCoursePreview(id));
    }

    // P1-1: Xem chi tiết nội dung bài học thật kèm đáp án đúng
    @GetMapping("/content-items/{id}/preview")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminContentItemPreviewDto> getContentItemPreview(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getContentItemPreview(id));
    }

    @PostMapping("/courses/{id}/re-audit")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, String>> reAuditWithAi(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        String report = adminService.reAuditCourseWithAi(adminId, id);
        return ResponseEntity.ok(Map.of("aiReport", report));
    }

    @PostMapping("/courses/{id}/approve")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminCourseDto> approveCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : "Được phê duyệt bởi Quản trị viên";
        String checklist = body != null ? body.get("checklist") : null;
        return ResponseEntity.ok(AdminCourseDto.from(courseService.approve(adminId, id, note, checklist)));
    }

    @PostMapping("/courses/{id}/reject")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminCourseDto> rejectCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String reasonCode = body.getOrDefault("reasonCode", "CONTENT_QUALITY");
        String note = body.get("note");
        return ResponseEntity.ok(AdminCourseDto.from(courseService.reject(adminId, id, reasonCode, note)));
    }

    @PostMapping("/courses/{id}/suspend")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminCourseDto> suspendCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Khóa học bị tạm gỡ bởi Quản trị viên");
        return ResponseEntity.ok(AdminCourseDto.from(courseService.suspend(adminId, id, reason)));
    }

    @PostMapping("/courses/{id}/restore")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<AdminCourseDto> restoreCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        return ResponseEntity.ok(AdminCourseDto.from(courseService.restore(adminId, id)));
    }

    // 3. Thống kê Dashboard
    @GetMapping("/stats/overview")
    public ResponseEntity<Map<String, Object>> getOverviewStats(Authentication authentication) {
        Map<String, Object> stats = adminService.getOverviewStats();
        if (!hasAdminRole(authentication)) {
            // Kiểm duyệt viên chỉ thấy số liệu phục vụ kiểm duyệt
            stats = new HashMap<>(stats);
            stats.keySet().removeAll(ADMIN_ONLY_STAT_KEYS);
        }
        return ResponseEntity.ok(stats);
    }

    // 4. Nhật ký kiểm tra Audit Logs
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @AuthenticationPrincipal String callerId,
            Authentication authentication,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // ADMIN xem toàn bộ nhật ký (kể cả của kiểm duyệt viên); MODERATOR chỉ xem hoạt động của chính mình
        String actorFilter = hasAdminRole(authentication) ? null : callerId;
        return ResponseEntity.ok(adminService.getAuditLogs(actorFilter, action, targetType, q, page, size));
    }
}
