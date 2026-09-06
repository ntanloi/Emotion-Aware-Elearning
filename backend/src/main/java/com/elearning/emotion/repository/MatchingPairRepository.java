package com.elearning.emotion.repository;

import com.elearning.emotion.entity.MatchingPair;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MatchingPairRepository extends JpaRepository<MatchingPair, String> {
    List<MatchingPair> findByQuestionId(String questionId);
}
