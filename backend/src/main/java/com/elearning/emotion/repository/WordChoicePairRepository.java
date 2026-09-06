package com.elearning.emotion.repository;

import com.elearning.emotion.entity.WordChoicePair;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WordChoicePairRepository extends JpaRepository<WordChoicePair, String> {
    List<WordChoicePair> findByQuestionIdOrderByOrderIndex(String questionId);
}
