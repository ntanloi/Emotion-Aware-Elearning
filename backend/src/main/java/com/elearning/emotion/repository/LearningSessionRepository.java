package com.elearning.emotion.repository;

import com.elearning.emotion.entity.LearningSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LearningSessionRepository extends JpaRepository<LearningSession, String> {
    /**
     * Phiên "WAITING" = học viên mới mở trang bài giảng, CHƯA bấm Play -> không được tính là đã học.
     * Mọi truy vấn phục vụ báo cáo bên dưới đều loại WAITING.
     */
    @Query("SELECT s FROM LearningSession s WHERE s.user.id = :userId AND s.status <> 'WAITING' ORDER BY s.startTime DESC")
    List<LearningSession> findByUserIdOrderByStartTimeDesc(@Param("userId") String userId);

    @Query("SELECT s FROM LearningSession s WHERE s.contentItem.course.teacher.id = :teacherId ORDER BY s.startTime DESC")
    List<LearningSession> findByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT AVG(s.focusScore) FROM LearningSession s WHERE s.contentItem.course.teacher.id = :teacherId AND s.focusScore IS NOT NULL")
    Double findAvgFocusScoreByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COUNT(s) FROM LearningSession s WHERE s.contentItem.course.teacher.id = :teacherId")
    long countByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT s FROM LearningSession s WHERE s.user.id = :userId AND s.startTime BETWEEN :from AND :to AND s.status <> 'WAITING' ORDER BY s.startTime DESC")
    List<LearningSession> findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(
            @Param("userId") String userId,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to);

    @Query("SELECT DISTINCT s.user.id FROM LearningSession s WHERE s.startTime BETWEEN :from AND :to AND s.status <> 'WAITING'")
    List<String> findActiveUserIdsBetween(@Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to);

    @Query("SELECT s FROM LearningSession s WHERE s.user.id = :userId AND s.contentItem.id = :contentItemId AND s.status <> 'WAITING' ORDER BY s.startTime DESC")
    List<LearningSession> findByUserIdAndContentItemIdOrderByStartTimeDesc(
            @Param("userId") String userId,
            @Param("contentItemId") String contentItemId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE learning_sessions
        SET active_seconds = active_seconds + (
            CASE
                WHEN last_active_at IS NOT NULL AND TIMESTAMPDIFF(SECOND, last_active_at, :now) BETWEEN 1 AND 15
                THEN TIMESTAMPDIFF(SECOND, last_active_at, :now)
                ELSE 2
            END
        ),
        last_active_at = :now
        WHERE id = :sessionId
        """, nativeQuery = true)
    int touchSessionActivity(@Param("sessionId") String sessionId, @Param("now") java.time.LocalDateTime now);

    long countByUserIdAndHasCameraPermissionTrue(String userId);

    long countByUserId(String userId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query("UPDATE LearningSession s SET s.focusScore = null WHERE s.user.id = :userId")
    int resetFocusScoresByUserId(@Param("userId") String userId);

    @Query("SELECT s FROM LearningSession s WHERE s.status = 'FACE_LOST' AND s.faceLostSince < :limit")
    List<LearningSession> findFaceLostBefore(@Param("limit") java.time.LocalDateTime limit);

    @Query("SELECT s.attemptId FROM LearningSession s WHERE s.id = :id")
    String findAttemptId(@Param("id") String id);

    @Query("SELECT s FROM LearningSession s WHERE s.user.id = :userId AND s.status IN ('LEARNING', 'FACE_LOST')")
    List<LearningSession> findLearningByUserId(@Param("userId") String userId);
}