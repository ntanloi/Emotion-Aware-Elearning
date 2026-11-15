package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseFeaturedReviewDto;
import com.elearning.emotion.dto.CourseReviewDto;
import com.elearning.emotion.dto.CourseReviewListDto;
import com.elearning.emotion.dto.ReorderFeaturedReviewsRequest;
import com.elearning.emotion.dto.TeacherReviewReplyRequest;
import com.elearning.emotion.dto.TeacherReviewStatsDto;
import com.elearning.emotion.service.CourseFeaturedReviewService;
import com.elearning.emotion.service.TeacherReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherReviewController {

    private final TeacherReviewService teacherReviewService;
    private final CourseFeaturedReviewService featuredReviewService;

    @GetMapping("/courses/{courseId}/reviews")
    public CourseReviewListDto listReviews(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @RequestParam(required = false) Boolean hasImage,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean unanswered,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size
    ) {
        return teacherReviewService.listTeacherCourseReviews(
                teacherId, courseId, hasImage, minRating, rating, unanswered, sort, page, size
        );
    }

    @PutMapping("/reviews/{reviewId}/reply")
    public CourseReviewDto reply(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String reviewId,
            @Valid @RequestBody TeacherReviewReplyRequest req
    ) {
        return teacherReviewService.replyToReview(teacherId, reviewId, req);
    }

    @DeleteMapping("/reviews/{reviewId}/reply")
    public CourseReviewDto deleteReply(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String reviewId
    ) {
        return teacherReviewService.deleteReply(teacherId, reviewId);
    }

    @GetMapping("/courses/{courseId}/reviews/stats")
    public TeacherReviewStatsDto stats(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId
    ) {
        return teacherReviewService.getCourseReviewStats(teacherId, courseId);
    }

    // --- Quản lý đánh giá tiêu biểu được ghim (Phase 4) ---

    @GetMapping("/courses/{courseId}/featured-reviews")
    public List<CourseFeaturedReviewDto> listFeatured(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId
    ) {
        return featuredReviewService.listTeacherFeatured(teacherId, courseId);
    }

    @PutMapping("/courses/{courseId}/featured-reviews/{reviewId}")
    public CourseFeaturedReviewDto featureReview(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @PathVariable String reviewId
    ) {
        return featuredReviewService.featureReview(teacherId, courseId, reviewId);
    }

    @DeleteMapping("/courses/{courseId}/featured-reviews/{reviewId}")
    public ResponseEntity<Void> unfeatureReview(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @PathVariable String reviewId
    ) {
        featuredReviewService.unfeatureReview(teacherId, courseId, reviewId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/courses/{courseId}/featured-reviews/order")
    public List<CourseFeaturedReviewDto> reorderFeatured(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String courseId,
            @Valid @RequestBody ReorderFeaturedReviewsRequest req
    ) {
        return featuredReviewService.reorder(teacherId, courseId, req.reviewIds());
    }
}

