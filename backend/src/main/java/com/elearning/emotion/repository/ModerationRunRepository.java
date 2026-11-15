package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ModerationRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ModerationRunRepository extends JpaRepository<ModerationRun, String> {

    Optional<ModerationRun> findFirstByCourseIdOrderBySubmittedAtDesc(String courseId);

    List<ModerationRun> findByCourseIdOrderBySubmittedAtDesc(String courseId);

    List<ModerationRun> findByStatusOrderBySubmittedAtAsc(String status);

    List<ModerationRun> findByStatusAndSubmittedAtBefore(String status, LocalDateTime threshold);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ModerationRun r SET r.status = :newStatus, r.riskScore = :riskScore, r.riskLevel = :riskLevel, r.finishedAt = :finishedAt WHERE r.id = :id AND r.status = 'ANALYZING'")
    int updateStatusIfAnalyzing(@Param("id") String id,
                               @Param("newStatus") String newStatus,
                               @Param("riskScore") Integer riskScore,
                               @Param("riskLevel") String riskLevel,
                               @Param("finishedAt") LocalDateTime finishedAt);
}
