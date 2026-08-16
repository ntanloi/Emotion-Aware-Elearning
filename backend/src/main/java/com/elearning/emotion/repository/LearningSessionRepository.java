package com.elearning.emotion.repository;

import com.elearning.emotion.entity.LearningSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningSessionRepository extends JpaRepository<LearningSession, String> {
    List<LearningSession> findByUserIdOrderByStartTimeDesc(String userId);
}
