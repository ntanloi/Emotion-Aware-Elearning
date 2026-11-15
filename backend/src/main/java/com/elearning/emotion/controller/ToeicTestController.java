package com.elearning.emotion.controller;

import com.elearning.emotion.dto.test.ToeicTestDto;
import com.elearning.emotion.service.ToeicTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class ToeicTestController {

    private final ToeicTestService toeicTestService;

    @GetMapping
    public ResponseEntity<Page<ToeicTestDto>> listTests(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 12, sort = "publishedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(toeicTestService.listPublishedTests(source, q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ToeicTestDto> getTest(
            @PathVariable("id") String id,
            @AuthenticationPrincipal String currentUserId
    ) {
        return ResponseEntity.ok(toeicTestService.getTest(id, currentUserId));
    }
}
