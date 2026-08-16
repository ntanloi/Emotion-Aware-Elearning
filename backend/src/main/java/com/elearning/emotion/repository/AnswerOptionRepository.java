package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AnswerOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerOptionRepository extends JpaRepository<AnswerOption, String> {
}
