package com.elearning.emotion.controller;

import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.service.TestAttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test-attempts")
@RequiredArgsConstructor
public class TestAttemptController {

    private final TestAttemptService testAttemptService;

    @PostMapping
    public ResponseEntity<TestAttemptStartResponse> startAttempt(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TestAttemptStartRequest req
    ) {
        return ResponseEntity.ok(testAttemptService.startAttempt(userId, req));
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<TestContentDto> getAttemptContent(
            @AuthenticationPrincipal String userId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(testAttemptService.getAttemptContent(userId, id));
    }

    @PostMapping("/{id}/save")
    public ResponseEntity<Map<String, Object>> saveDraft(
            @AuthenticationPrincipal String userId,
            @PathVariable("id") String id,
            @RequestBody TestAttemptSaveDraftRequest req
    ) {
        return ResponseEntity.ok(testAttemptService.saveDraft(userId, id, req));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<TestAttemptResultDto> submitAttempt(
            @AuthenticationPrincipal String userId,
            @PathVariable("id") String id,
            @RequestBody TestAttemptSubmitRequest req
    ) {
        return ResponseEntity.ok(testAttemptService.submitAttempt(userId, id, req));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<TestAttemptResultDto> getAttemptResult(
            @AuthenticationPrincipal String userId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(testAttemptService.getAttemptResult(userId, id));
    }

    @GetMapping("/mine")
    public ResponseEntity<Page<TestAttemptSummaryDto>> getMyAttempts(
            @AuthenticationPrincipal String userId,
            @PageableDefault(size = 10, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(testAttemptService.getMyAttempts(userId, pageable));
    }
}
