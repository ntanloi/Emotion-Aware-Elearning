package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseCustomSectionDto;
import com.elearning.emotion.dto.CourseCustomSectionRequest;
import com.elearning.emotion.service.CourseCustomSectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CRUD cho các mục nội dung tùy chỉnh trong sidebar giáo viên.
 * GET  /api/courses/{courseId}/custom-sections        — public (học viên cũng cần xem)
 * POST /api/courses/{courseId}/custom-sections        — TEACHER only
 * PUT  /api/courses/{courseId}/custom-sections/{id}   — TEACHER only
 * DELETE /api/courses/{courseId}/custom-sections/{id} — TEACHER only
 */
@RestController
@RequestMapping("/api/courses/{courseId}/custom-sections")
@RequiredArgsConstructor
public class CourseCustomSectionController {

    private final CourseCustomSectionService service;

    @GetMapping
    public List<CourseCustomSectionDto> list(@PathVariable String courseId) {
        return service.list(courseId);
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public CourseCustomSectionDto create(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @Valid @RequestBody CourseCustomSectionRequest req) {
        return service.create(teacherId, courseId, req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseCustomSectionDto update(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @PathVariable String id,
            @Valid @RequestBody CourseCustomSectionRequest req) {
        return service.update(teacherId, id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @PathVariable String id) {
        service.delete(teacherId, id);
    }
}
