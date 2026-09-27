package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseReviewDto;
import com.elearning.emotion.dto.CourseReviewListDto;
import com.elearning.emotion.dto.CourseReviewRequest;
import com.elearning.emotion.dto.MyCourseReviewDto;
import com.elearning.emotion.service.CourseReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Danh gia khoa hoc (sao + binh luan).
 * GET (danh sach + xem "mine") nam trong /api/courses/** nen duoc permitAll o SecurityConfig
 *  -> khach vang lai / hoc vien chua dang ky van xem duoc review va so sao (dung yeu cau).
 * POST/PUT/DELETE roi vao anyRequest().authenticated() -> bat buoc dang nhap; kiem tra da-enroll-chua
 *  o CourseReviewService (chi hoc vien da dang ky moi duoc danh gia).
 */
@RestController
@RequestMapping("/api/courses/{courseId}/reviews")
@RequiredArgsConstructor
public class CourseReviewController {

    private final CourseReviewService reviewService;

    @GetMapping
    public CourseReviewListDto list(@PathVariable String courseId) {
        return reviewService.list(courseId);
    }

    @GetMapping("/mine")
    public MyCourseReviewDto mine(@AuthenticationPrincipal String userId, @PathVariable String courseId) {
        return reviewService.mine(userId, courseId);
    }

    @PostMapping
    public CourseReviewDto create(@AuthenticationPrincipal String userId, @PathVariable String courseId,
                                   @Valid @RequestBody CourseReviewRequest req) {
        return reviewService.create(userId, courseId, req);
    }

    @PutMapping
    public CourseReviewDto update(@AuthenticationPrincipal String userId, @PathVariable String courseId,
                                   @Valid @RequestBody CourseReviewRequest req) {
        return reviewService.update(userId, courseId, req);
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@AuthenticationPrincipal String userId, @PathVariable String courseId) {
        reviewService.delete(userId, courseId);
        return ResponseEntity.noContent().build();
    }
}
