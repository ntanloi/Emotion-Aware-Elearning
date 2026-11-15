package com.elearning.emotion.controller;

import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.service.AdminToeicTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/tests")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminToeicTestController {

    private final AdminToeicTestService adminToeicTestService;

    @GetMapping
    public ResponseEntity<Page<ToeicTestDto>> listTests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminToeicTestService.listTests(status, q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminTestDetailDto> getTestDetail(
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(adminToeicTestService.getTestDetailForAdmin(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ToeicTestDto> approveTest(
            @AuthenticationPrincipal String adminId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(adminToeicTestService.approveTest(adminId, id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ToeicTestDto> rejectTest(
            @AuthenticationPrincipal String adminId,
            @PathVariable("id") String id,
            @Valid @RequestBody TestRejectRequest req
    ) {
        return ResponseEntity.ok(adminToeicTestService.rejectTest(adminId, id, req.reason()));
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<ToeicTestDto> hideTest(
            @AuthenticationPrincipal String adminId,
            @PathVariable("id") String id,
            @Valid @RequestBody TestRejectRequest req
    ) {
        return ResponseEntity.ok(adminToeicTestService.hideViolationTest(adminId, id, req.reason()));
    }

    @PostMapping("/system")
    public ResponseEntity<ToeicTestDto> createSystemTest(
            @AuthenticationPrincipal String adminId,
            @Valid @RequestBody ToeicTestPublishRequest req
    ) {
        return ResponseEntity.ok(adminToeicTestService.createSystemTest(adminId, req));
    }

    @PostMapping("/seed-samples")
    public ResponseEntity<java.util.List<ToeicTestDto>> seedSampleTests(
            @AuthenticationPrincipal String adminId
    ) {
        return ResponseEntity.ok(adminToeicTestService.seedSampleSystemTests(adminId));
    }
}
