package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CourseCustomSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CourseCustomSectionRepository extends JpaRepository<CourseCustomSection, String> {
    List<CourseCustomSection> findByCourseIdOrderByOrderIndex(String courseId);
}
