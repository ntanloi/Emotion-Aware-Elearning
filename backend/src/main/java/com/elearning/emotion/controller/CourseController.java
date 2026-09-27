package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseCreateRequest;
import com.elearning.emotion.dto.CourseDto;
import com.elearning.emotion.dto.CourseUpdateRequest;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.service.CourseReviewService;
import com.elearning.emotion.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final CourseService courseService;
    private final CourseReviewService courseReviewService;

    // FR-ACC-02: danh sach khoa hoc cong khai (chi hien PUBLISHED cho khach vang lai/hoc vien)
    @GetMapping
    public List<CourseDto> list() {
        List<Course> courses = courseRepository.findByStatus("PUBLISHED");
        Map<String, double[]> ratings = courseReviewService.summariesFor(courses.stream().map(Course::getId).toList());
        return courses.stream()
                .map(c -> {
                    double[] r = ratings.get(c.getId());
                    return CourseDto.from(c, r != null ? r[0] : null, r != null ? (long) r[1] : 0L);
                })
                .toList();
    }

    @GetMapping("/{id}")
    public CourseDto get(@PathVariable String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        Map<String, double[]> ratings = courseReviewService.summariesFor(List.of(id));
        double[] r = ratings.get(id);
        return CourseDto.from(course, r != null ? r[0] : null, r != null ? (long) r[1] : 0L);
    }

    // FR-TCH-01: danh sach khoa hoc CUA CHINH giang vien dang dang nhap (gom ca DRAFT/HIDDEN)
    @GetMapping("/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<CourseDto> mine(@AuthenticationPrincipal String teacherId) {
        return courseRepository.findByTeacherId(teacherId).stream().map(CourseDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto create(@AuthenticationPrincipal String teacherId, @Valid @RequestBody CourseCreateRequest req) {
        return CourseDto.from(courseService.create(teacherId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                            @RequestBody CourseUpdateRequest req) {
        return CourseDto.from(courseService.update(teacherId, id, req));
    }

    // FR-TCH-01: publish/an khoa hoc - dung lai update() voi status
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto publish(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.from(courseService.update(teacherId, id,
                new CourseUpdateRequest(null, null, null, null, null, null, null, "PUBLISHED")));
    }

    @PostMapping("/{id}/hide")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto hide(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.from(courseService.update(teacherId, id,
                new CourseUpdateRequest(null, null, null, null, null, null, null, "HIDDEN")));
    }
}
