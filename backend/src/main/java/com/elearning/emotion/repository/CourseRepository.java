package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, String> {
}
