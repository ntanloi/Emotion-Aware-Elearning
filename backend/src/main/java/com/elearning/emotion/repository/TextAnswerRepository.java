package com.elearning.emotion.repository;

import com.elearning.emotion.entity.TextAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TextAnswerRepository extends JpaRepository<TextAnswer, String> {
    Optional<TextAnswer> findByQuestionId(String questionId);
    List<TextAnswer> findByQuestionIdIn(List<String> questionIds);
}
