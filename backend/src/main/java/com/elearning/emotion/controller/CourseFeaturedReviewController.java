package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseFeaturedReviewDto;
import com.elearning.emotion.service.CourseFeaturedReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller công khai lấy danh sách đánh giá tiêu biểu được ghim cho khóa học (Phase 4)
 */
@RestController
@RequestMapping("/api/courses/{courseId}/featured-reviews")
@RequiredArgsConstructor
public class CourseFeaturedReviewController {

    private final CourseFeaturedReviewService featuredReviewService;

    @GetMapping
    public List<CourseFeaturedReviewDto> listPublicFeatured(@PathVariable String courseId) {
        return featuredReviewService.listPublicFeatured(courseId);
    }
}
