package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {
    List<Enrollment> findByUserId(String userId);
    Optional<Enrollment> findByUserIdAndCourseId(String userId, String courseId);
    boolean existsByUserIdAndCourseId(String userId, String courseId);

    @Query("SELECT e FROM Enrollment e WHERE e.course.teacher.id = :teacherId ORDER BY e.enrolledAt DESC")
    List<Enrollment> findByTeacherIdOrderByEnrolledAtDesc(@Param("teacherId") String teacherId);

    @Query("SELECT COUNT(DISTINCT e.user.id) FROM Enrollment e WHERE e.course.teacher.id = :teacherId")
    long countDistinctStudentsByTeacherId(@Param("teacherId") String teacherId);

    long countByCourseId(String courseId);

    @Query("SELECT e.user.id, COUNT(e) FROM Enrollment e WHERE e.user.id IN :userIds GROUP BY e.user.id")
    List<Object[]> countEnrollmentsByUserIds(@Param("userIds") List<String> userIds);
}
