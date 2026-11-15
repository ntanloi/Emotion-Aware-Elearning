package com.elearning.emotion.controller;

import com.elearning.emotion.dto.TeacherDashboardDto;
import com.elearning.emotion.service.TeacherDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherDashboardController {

    private final TeacherDashboardService teacherDashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<TeacherDashboardDto> getDashboard(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(teacherDashboardService.getTeacherDashboard(userId));
    }

    @GetMapping("/content-items/{contentItemId}/emotion-timeline")
    public ResponseEntity<com.elearning.emotion.dto.VideoEmotionTimelineDto> getEmotionTimeline(
            @PathVariable String contentItemId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer durationSec,
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(teacherDashboardService.getVideoEmotionTimeline(userId, contentItemId, durationSec));
    }
}
