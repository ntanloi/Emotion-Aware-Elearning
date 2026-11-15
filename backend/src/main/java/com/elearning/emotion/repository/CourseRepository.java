package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Course;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, String>, JpaSpecificationExecutor<Course> {
    List<Course> findByStatus(String status);
    List<Course> findByStatus(String status, org.springframework.data.domain.Pageable pageable);
    List<Course> findByTeacherId(String teacherId);
    Optional<Course> findFirstByTeacherIdAndProfile(String teacherId, String profile);
    long countByStatus(String status);
    long countByTeacherId(String teacherId);
    long countByTeacherIdAndStatus(String teacherId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Course c WHERE c.id = :id")
    Optional<Course> findByIdWithLock(@Param("id") String id);

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.teacher LEFT JOIN FETCH c.coverMedia WHERE c.id = :id")
    Optional<Course> findByIdWithTeacherAndCover(@Param("id") String id);

    @Query("SELECT c.teacher.id, COUNT(c) FROM Course c WHERE c.teacher.id IN :teacherIds GROUP BY c.teacher.id")
    List<Object[]> countCoursesByTeacherIds(@Param("teacherIds") List<String> teacherIds);

    @Query("SELECT COUNT(c) FROM Course c WHERE c.status = 'PUBLISHED' AND c.contentChangedAt IS NOT NULL AND c.reviewedAt IS NOT NULL AND c.contentChangedAt > c.reviewedAt")
    long countModifiedCoursesAfterPublish();

    @Query("SELECT c FROM Course c WHERE c.status = 'PENDING_REVIEW' ORDER BY c.submittedAt ASC")
    List<Course> findTopPendingCoursesOrderBySubmittedAtAsc(org.springframework.data.domain.Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' AND c.contentChangedAt IS NOT NULL AND c.reviewedAt IS NOT NULL AND c.contentChangedAt > c.reviewedAt ORDER BY c.contentChangedAt DESC")
    List<Course> findTopModifiedCourses(org.springframework.data.domain.Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Course c WHERE c.id = :id")
    Optional<Course> findByIdForUpdate(@Param("id") String id);
}
