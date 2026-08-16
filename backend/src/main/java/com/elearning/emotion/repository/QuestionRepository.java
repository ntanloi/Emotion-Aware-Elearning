package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, String> {
}
