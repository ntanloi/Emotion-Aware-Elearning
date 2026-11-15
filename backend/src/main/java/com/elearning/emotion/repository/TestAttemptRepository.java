package com.elearning.emotion.repository;

import com.elearning.emotion.entity.TestAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TestAttemptRepository extends JpaRepository<TestAttempt, String> {

    List<TestAttempt> findByUserIdOrderByStartedAtDesc(String userId);

    Page<TestAttempt> findByUserIdOrderByStartedAtDesc(String userId, Pageable pageable);

    List<TestAttempt> findByTestIdOrderByStartedAtDesc(String testId);

    Optional<TestAttempt> findByIdAndUserId(String id, String userId);

    long countByTestId(String testId);

    long countByTestIdAndStatus(String testId, String status);

    long countByUserId(String userId);

    Optional<TestAttempt> findFirstByUserIdAndTestIdAndStatusOrderByStartedAtDesc(String userId, String testId, String status);

    long countByUserIdAndStartedAtAfter(String userId, LocalDateTime after);

    @Query("SELECT AVG(ta.scoreTotal) FROM TestAttempt ta WHERE ta.test.id = :testId AND ta.status = 'COMPLETED' AND ta.scoreTotal IS NOT NULL")
    Double getAverageScoreByTestId(@Param("testId") String testId);

    @Query("SELECT AVG(ta.scoreListening) FROM TestAttempt ta WHERE ta.test.id = :testId AND ta.status = 'COMPLETED' AND ta.scoreListening IS NOT NULL")
    Double getAverageListeningScoreByTestId(@Param("testId") String testId);

    @Query("SELECT AVG(ta.scoreReading) FROM TestAttempt ta WHERE ta.test.id = :testId AND ta.status = 'COMPLETED' AND ta.scoreReading IS NOT NULL")
    Double getAverageReadingScoreByTestId(@Param("testId") String testId);

    @Query("SELECT COUNT(ta) FROM TestAttempt ta WHERE ta.test.author.id = :authorId AND ta.status = 'COMPLETED'")
    long countCompletedByAuthorId(@Param("authorId") String authorId);

    @Query("SELECT AVG(ta.scoreTotal) FROM TestAttempt ta WHERE ta.test.author.id = :authorId AND ta.status = 'COMPLETED' AND ta.scoreTotal IS NOT NULL")
    Double getOverallAverageScoreByAuthorId(@Param("authorId") String authorId);
}
