package com.elearning.emotion.controller;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;

    // FR-ACC-02: danh sach khoa hoc cong khai
    @GetMapping
    public List<Course> list() {
        return courseRepository.findAll();
    }

    @GetMapping("/{id}")
    public Course get(@PathVariable String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
    }
}
