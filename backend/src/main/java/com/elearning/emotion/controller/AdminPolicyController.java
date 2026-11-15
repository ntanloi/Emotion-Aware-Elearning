package com.elearning.emotion.controller;

import com.elearning.emotion.entity.CoursePolicy;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CoursePolicyRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.service.PolicyService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/moderation/policies")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminPolicyController {

    private final PolicyService policyService;
    private final CoursePolicyRepository coursePolicyRepository;
    private final UserRepository userRepository;

    /**
     * Lấy chính sách kiểm duyệt đang kích hoạt (Active Policy)
     */
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActivePolicy() {
        JsonNode config = policyService.getActivePolicy();
        int version = policyService.getActivePolicyVersion();
        return ResponseEntity.ok(Map.of(
                "version", version,
                "config", config
        ));
    }

    /**
     * Lấy danh sách lịch sử các phiên bản chính sách
     */
    @GetMapping("/history")
    public ResponseEntity<List<PolicySummaryDto>> getPolicyHistory() {
        List<CoursePolicy> policies = coursePolicyRepository.findAll();
        List<PolicySummaryDto> dtos = policies.stream()
                .map(p -> new PolicySummaryDto(
                        p.getId(),
                        p.getVersion(),
                        p.getActive(),
                        p.getCreatedBy() != null ? p.getCreatedBy().getEmail() : "Hệ thống",
                        p.getCreatedAt()
                ))
                .sorted((a, b) -> Integer.compare(b.version(), a.version()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Tạo và kích hoạt phiên bản chính sách mới
     */
    @PostMapping
    public ResponseEntity<?> createPolicyVersion(
            @AuthenticationPrincipal String adminId,
            @RequestBody String configJson) {
        try {
            User admin = userRepository.findById(adminId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));
            CoursePolicy created = policyService.createNewVersion(admin, configJson);
            return ResponseEntity.ok(Map.of(
                    "id", created.getId(),
                    "version", created.getVersion(),
                    "active", created.getActive(),
                    "message", "Đã tạo và kích hoạt chính sách phiên bản " + created.getVersion() + " thành công"
            ));
        } catch (Exception e) {
            log.error("Lỗi cập nhật chính sách kiểm duyệt: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", "Cấu hình JSON chính sách không hợp lệ: " + e.getMessage()));
        }
    }

    public record PolicySummaryDto(
            String id,
            Integer version,
            Boolean active,
            String createdBy,
            LocalDateTime createdAt
    ) {}
}
