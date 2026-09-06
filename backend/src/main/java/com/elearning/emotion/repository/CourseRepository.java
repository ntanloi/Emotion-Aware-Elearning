package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, String> {
    List<Course> findByStatus(String status);
    List<Course> findByTeacherId(String teacherId);
}
