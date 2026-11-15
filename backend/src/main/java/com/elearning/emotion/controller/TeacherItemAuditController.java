package com.elearning.emotion.controller;

import com.elearning.emotion.dto.moderation.ItemAuditResultDto;
import com.elearning.emotion.service.TeacherItemAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teacher/content-items")
@RequiredArgsConstructor
public class TeacherItemAuditController {

    private final TeacherItemAuditService teacherItemAuditService;

    /**
     * Giảng viên yêu cầu thẩm định lại một hoạt động bài học (hoặc kiểm tra riêng 1 luật cụ thể)
     */
    @PostMapping("/{itemId}/audit")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<ItemAuditResultDto> auditItem(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String itemId,
            @RequestParam(required = false) String ruleId) {
        return ResponseEntity.ok(teacherItemAuditService.auditItem(teacherId, itemId, ruleId));
    }
}
