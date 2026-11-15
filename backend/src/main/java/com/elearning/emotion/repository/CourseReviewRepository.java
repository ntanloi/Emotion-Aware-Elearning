package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CourseReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseReviewRepository extends JpaRepository<CourseReview, String> {

    List<CourseReview> findByCourseIdAndStatusOrderByCreatedAtDesc(String courseId, String status);

    List<CourseReview> findByCourseIdOrderByCreatedAtDesc(String courseId);

    List<CourseReview> findByCourseIdAndStatus(String courseId, String status);

    Optional<CourseReview> findByCourseIdAndUserId(String courseId, String userId);

    boolean existsByCourseIdAndUserId(String courseId, String userId);

    /** Dùng cho danh sách khóa học (CourseCard/CourseListPage) - tính điểm trung bình + số lượng review
     *  cho nhiều khóa học cùng lúc, chỉ tính review PUBLISHED. */
    @Query("select r.course.id as courseId, avg(r.rating) as avgRating, count(r) as total " +
           "from CourseReview r where r.course.id in :courseIds and r.status = 'PUBLISHED' group by r.course.id")
    List<CourseRatingProjection> aggregateForCourses(@Param("courseIds") List<String> courseIds);

    interface CourseRatingProjection {
        String getCourseId();
        Double getAvgRating();
        Long getTotal();
    }
}
