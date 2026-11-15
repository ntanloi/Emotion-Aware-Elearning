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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final CourseService courseService;
    private final AuditLogRepository auditLogRepository;

    // 1. Quản lý người dùng (Học viên & Giảng viên)
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserDto>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getUsers(role, status, q, page, size));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<AdminUserDto> updateUserStatus(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(adminService.updateUserStatus(adminId, id, status, reason));
    }

    @GetMapping("/teachers/pending")
    public ResponseEntity<List<AdminUserDto>> getPendingTeachers() {
        return ResponseEntity.ok(adminService.getPendingTeachers());
    }

    @PostMapping("/teachers/{id}/approve")
    public ResponseEntity<AdminUserDto> approveTeacher(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        return ResponseEntity.ok(adminService.approveTeacher(adminId, id));
    }

    @PostMapping("/teachers/{id}/reject")
    public ResponseEntity<AdminUserDto> rejectTeacher(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(adminService.rejectTeacher(adminId, id, reason));
    }

    // 2. Quản lý & duyệt khóa học
    @GetMapping("/courses")
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
    public ResponseEntity<Map<String, Object>> getCourseReviewDetails(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getCourseReviewDetails(id));
    }

    // P1-1: Xem toàn bộ cây mục lục nội dung khóa học
    @GetMapping("/courses/{id}/preview")
    public ResponseEntity<AdminCoursePreviewDto> getCoursePreview(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getCoursePreview(id));
    }

    // P1-1: Xem chi tiết nội dung bài học thật kèm đáp án đúng
    @GetMapping("/content-items/{id}/preview")
    public ResponseEntity<AdminContentItemPreviewDto> getContentItemPreview(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getContentItemPreview(id));
    }

    @PostMapping("/courses/{id}/re-audit")
    public ResponseEntity<Map<String, String>> reAuditWithAi(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        String report = adminService.reAuditCourseWithAi(adminId, id);
        return ResponseEntity.ok(Map.of("aiReport", report));
    }

    @PostMapping("/courses/{id}/approve")
    public ResponseEntity<AdminCourseDto> approveCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : "Được phê duyệt bởi Quản trị viên";
        String checklist = body != null ? body.get("checklist") : null;
        return ResponseEntity.ok(AdminCourseDto.from(courseService.approve(adminId, id, note, checklist)));
    }

    @PostMapping("/courses/{id}/reject")
    public ResponseEntity<AdminCourseDto> rejectCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String reasonCode = body.getOrDefault("reasonCode", "CONTENT_QUALITY");
        String note = body.get("note");
        return ResponseEntity.ok(AdminCourseDto.from(courseService.reject(adminId, id, reasonCode, note)));
    }

    @PostMapping("/courses/{id}/suspend")
    public ResponseEntity<AdminCourseDto> suspendCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Khóa học bị tạm gỡ bởi Quản trị viên");
        return ResponseEntity.ok(AdminCourseDto.from(courseService.suspend(adminId, id, reason)));
    }

    @PostMapping("/courses/{id}/restore")
    public ResponseEntity<AdminCourseDto> restoreCourse(
            @AuthenticationPrincipal String adminId,
            @PathVariable String id) {
        return ResponseEntity.ok(AdminCourseDto.from(courseService.restore(adminId, id)));
    }

    // 3. Thống kê Dashboard
    @GetMapping("/stats/overview")
    public ResponseEntity<Map<String, Object>> getOverviewStats() {
        return ResponseEntity.ok(adminService.getOverviewStats());
    }

    // 4. Nhật ký kiểm tra Audit Logs
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAuditLogs(action, targetType, q, page, size));
    }
}
