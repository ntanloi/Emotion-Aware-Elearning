package com.elearning.emotion.repository;

import com.elearning.emotion.entity.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizResultRepository extends JpaRepository<QuizResult, String> {
}
