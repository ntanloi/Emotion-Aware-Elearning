package com.elearning.emotion.repository;

import com.elearning.emotion.entity.LessonFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonFeedbackRepository extends JpaRepository<LessonFeedback, String> {
}
