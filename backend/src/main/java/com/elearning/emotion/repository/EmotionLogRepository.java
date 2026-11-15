package com.elearning.emotion.repository;

import com.elearning.emotion.entity.EmotionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EmotionLogRepository extends JpaRepository<EmotionLog, String> {
    List<EmotionLog> findBySessionIdOrderByCapturedAtAsc(String sessionId);

    // BR-11: chi lay cac ban ghi dat nguong tin cay khi tinh focus_score
    List<EmotionLog> findBySessionIdAndConfidenceScoreGreaterThanEqual(String sessionId, Float minConfidence);

    // Cửa sổ trượt các khung gần nhất để đánh giá gợi ý học tập thích ứng (18s mất tập trung / 6s bối rối)
    List<EmotionLog> findTop6BySessionIdOrderByCapturedAtDesc(String sessionId);
    List<EmotionLog> findTop25BySessionIdOrderByCapturedAtDesc(String sessionId);

    List<EmotionLog> findBySessionId(String sessionId);

    long countBySessionId(String sessionId);

    long countBySessionIdAndLearningState(String sessionId, String learningState);

    // Lấy toàn bộ emotion logs có videoTimeSec của bài giảng để vẽ timeline cho giảng viên
    @Query("SELECT l FROM EmotionLog l WHERE l.session.contentItem.id = :contentItemId AND l.videoTimeSec IS NOT NULL ORDER BY l.videoTimeSec ASC")
    List<EmotionLog> findByContentItemIdWithVideoTime(@Param("contentItemId") String contentItemId);

    @Query("SELECT COUNT(l) FROM EmotionLog l WHERE l.session.user.id = :userId")
    long countByUserId(@Param("userId") String userId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query("DELETE FROM EmotionLog l WHERE l.session.user.id = :userId")
    int deleteByUserId(@Param("userId") String userId);
}

