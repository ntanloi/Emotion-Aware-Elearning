package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttemptRepository extends JpaRepository<Attempt, String> {
    List<Attempt> findByUserIdOrderByStartedAtDesc(String userId);
    List<Attempt> findByTestAttemptId(String testAttemptId);
    List<Attempt> findByContentItemId(String contentItemId);
    List<Attempt> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(String userId, java.time.LocalDateTime from, java.time.LocalDateTime to);
    List<Attempt> findByUserIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(String userId);
    List<Attempt> findByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(String userId, java.time.LocalDateTime from, java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.user.id FROM Attempt a WHERE a.submittedAt BETWEEN :from AND :to")
    List<String> findActiveUserIdsBetween(
        @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
        @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to
    );

    @org.springframework.data.jpa.repository.Query("""
        SELECT a FROM Attempt a
        JOIN FETCH a.contentItem ci
        JOIN FETCH ci.course c
        WHERE a.user.id = :userId
          AND a.submittedAt IS NOT NULL
          AND (:courseId IS NULL OR c.id = :courseId)
          AND (:fromUtc IS NULL OR a.submittedAt >= :fromUtc)
          AND (:toUtc IS NULL OR a.submittedAt <= :toUtc)
        ORDER BY a.submittedAt DESC
    """)
    List<Attempt> findCompletedAttemptsByFilter(
        @org.springframework.data.repository.query.Param("userId") String userId,
        @org.springframework.data.repository.query.Param("courseId") String courseId,
        @org.springframework.data.repository.query.Param("fromUtc") java.time.LocalDateTime fromUtc,
        @org.springframework.data.repository.query.Param("toUtc") java.time.LocalDateTime toUtc
    );
}
