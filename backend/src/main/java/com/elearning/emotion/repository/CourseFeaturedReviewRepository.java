package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CourseFeaturedReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourseFeaturedReviewRepository extends JpaRepository<CourseFeaturedReview, String> {

    List<CourseFeaturedReview> findByCourseIdOrderBySortOrderAsc(String courseId);

    Optional<CourseFeaturedReview> findByCourseIdAndReviewId(String courseId, String reviewId);

    long countByCourseId(String courseId);

    boolean existsByCourseIdAndReviewId(String courseId, String reviewId);

    void deleteByCourseIdAndReviewId(String courseId, String reviewId);

    void deleteByReviewId(String reviewId);

    List<CourseFeaturedReview> findByReviewId(String reviewId);
}
