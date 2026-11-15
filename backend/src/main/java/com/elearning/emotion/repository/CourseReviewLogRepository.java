package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CourseReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseReviewLogRepository extends JpaRepository<CourseReviewLog, String> {
    List<CourseReviewLog> findByCourseIdOrderByCreatedAtDesc(String courseId);
}
