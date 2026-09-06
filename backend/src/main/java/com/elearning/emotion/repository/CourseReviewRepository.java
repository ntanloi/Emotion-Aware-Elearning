package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CourseReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseReviewRepository extends JpaRepository<CourseReview, String> {

    List<CourseReview> findByCourseIdOrderByCreatedAtDesc(String courseId);

    Optional<CourseReview> findByCourseIdAndUserId(String courseId, String userId);

    boolean existsByCourseIdAndUserId(String courseId, String userId);

    /** Dung cho danh sach khoa hoc (CourseCard/CourseListPage) - tinh diem trung binh + so luong review
     *  cho nhieu khoa hoc cung luc, tranh phai load tung CourseReview mot. */
    @Query("select r.course.id as courseId, avg(r.rating) as avgRating, count(r) as total " +
           "from CourseReview r where r.course.id in :courseIds group by r.course.id")
    List<CourseRatingProjection> aggregateForCourses(@Param("courseIds") List<String> courseIds);

    interface CourseRatingProjection {
        String getCourseId();
        Double getAvgRating();
        Long getTotal();
    }
}
