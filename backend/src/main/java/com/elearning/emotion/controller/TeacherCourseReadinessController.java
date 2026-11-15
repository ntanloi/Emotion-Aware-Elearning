package com.elearning.emotion.controller;

import com.elearning.emotion.moderation.engine.CourseReadinessService;
import com.elearning.emotion.moderation.model.ReadinessReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/courses")
@RequiredArgsConstructor
public class TeacherCourseReadinessController {

    private final CourseReadinessService courseReadinessService;

    @GetMapping("/{id}/readiness")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ReadinessReportDto> getCourseReadiness(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String id) {
        return ResponseEntity.ok(courseReadinessService.checkReadiness(id, teacherId));
    }
}
