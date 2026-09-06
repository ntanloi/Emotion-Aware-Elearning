package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, String> {
    List<AttemptAnswer> findByAttemptId(String attemptId);
    List<AttemptAnswer> findByQuestionId(String questionId);
}