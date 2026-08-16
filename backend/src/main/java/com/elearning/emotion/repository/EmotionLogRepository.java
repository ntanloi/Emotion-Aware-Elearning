package com.elearning.emotion.repository;

import com.elearning.emotion.entity.EmotionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmotionLogRepository extends JpaRepository<EmotionLog, String> {
    List<EmotionLog> findBySessionIdOrderByCapturedAtAsc(String sessionId);

    // BR-11: chi lay cac ban ghi dat nguong tin cay khi tinh focus_score
    List<EmotionLog> findBySessionIdAndConfidenceScoreGreaterThanEqual(String sessionId, Float minConfidence);
}
