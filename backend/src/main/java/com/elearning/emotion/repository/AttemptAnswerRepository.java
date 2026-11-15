package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, String> {
    List<AttemptAnswer> findByAttemptId(String attemptId);
    List<AttemptAnswer> findByAttemptIdIn(Collection<String> attemptIds);
    List<AttemptAnswer> findByQuestionId(String questionId);

    @Query("SELECT COUNT(DISTINCT aa.question.id) FROM AttemptAnswer aa WHERE aa.attempt.user.id = :userId AND aa.attempt.contentItem.id = :contentItemId")
    long countDistinctQuestionsAnsweredByUserAndItem(@Param("userId") String userId, @Param("contentItemId") String contentItemId);

    @Query("SELECT DISTINCT aa.question.id FROM AttemptAnswer aa WHERE aa.attempt.user.id = :userId AND aa.attempt.contentItem.id = :contentItemId")
    List<String> findDistinctQuestionIdsByUserAndItem(@Param("userId") String userId, @Param("contentItemId") String contentItemId);

    @Query("SELECT aa.attempt.contentItem.id, COUNT(DISTINCT aa.question.id) FROM AttemptAnswer aa WHERE aa.attempt.user.id = :userId AND aa.attempt.contentItem.id IN :itemIds GROUP BY aa.attempt.contentItem.id")
    List<Object[]> countDistinctQuestionsAnsweredByUserAndItemIds(@Param("userId") String userId, @Param("itemIds") Collection<String> itemIds);

    @Query("SELECT aa FROM AttemptAnswer aa WHERE aa.attempt.user.id = :userId AND aa.attempt.contentItem.id = :contentItemId ORDER BY aa.createdAt ASC")
    List<AttemptAnswer> findByUserAndContentItemId(@Param("userId") String userId, @Param("contentItemId") String contentItemId);

    @Query("SELECT aa FROM AttemptAnswer aa WHERE aa.attempt.user.id = :userId " +
           "AND aa.question.id = :qid AND aa.attempt.submittedAt IS NOT NULL " +
           "ORDER BY aa.attempt.submittedAt DESC")
    List<AttemptAnswer> findSubmittedByUserAndQuestion(@Param("userId") String userId, @Param("qid") String qid, org.springframework.data.domain.Pageable p);

    public interface PartAccuracyProjection {
        String getSectionCode();
        Long getTotalQuestions();
        Long getCorrectCount();
    }

    public interface TagAccuracyProjection {
        String getTag();
        Long getTotalQuestions();
        Long getCorrectCount();
    }

    @Query(value = """
        SELECT ci.section_code AS sectionCode,
               COUNT(aa.id) AS totalQuestions,
               SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS correctCount
        FROM attempt_answers aa
        JOIN attempts a ON aa.attempt_id = a.id
        JOIN content_items ci ON a.content_item_id = ci.id
        WHERE a.user_id = :userId
          AND (:courseId IS NULL OR ci.course_id = :courseId)
          AND (:fromUtc IS NULL OR a.submitted_at >= :fromUtc)
          AND (:toUtc IS NULL OR a.submitted_at <= :toUtc)
        GROUP BY ci.section_code
        ORDER BY ci.section_code ASC
        """, nativeQuery = true)
    List<PartAccuracyProjection> getPartAccuracy(
        @Param("userId") String userId,
        @Param("courseId") String courseId,
        @Param("fromUtc") java.time.LocalDateTime fromUtc,
        @Param("toUtc") java.time.LocalDateTime toUtc
    );

    @Query(value = """
        SELECT q.tag AS tag,
               COUNT(aa.id) AS totalQuestions,
               SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS correctCount
        FROM attempt_answers aa
        JOIN attempts a ON aa.attempt_id = a.id
        JOIN questions q ON aa.question_id = q.id
        JOIN content_items ci ON a.content_item_id = ci.id
        WHERE a.user_id = :userId
          AND q.tag IS NOT NULL
          AND TRIM(q.tag) != ''
          AND (:courseId IS NULL OR ci.course_id = :courseId)
          AND (:fromUtc IS NULL OR a.submitted_at >= :fromUtc)
          AND (:toUtc IS NULL OR a.submitted_at <= :toUtc)
        GROUP BY q.tag
        ORDER BY (SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(aa.id)) ASC
        """, nativeQuery = true)
    List<TagAccuracyProjection> getTagAccuracy(
        @Param("userId") String userId,
        @Param("courseId") String courseId,
        @Param("fromUtc") java.time.LocalDateTime fromUtc,
        @Param("toUtc") java.time.LocalDateTime toUtc
    );

    @Query("""
        SELECT aa FROM AttemptAnswer aa
        JOIN FETCH aa.question q
        JOIN FETCH aa.attempt a
        JOIN FETCH a.contentItem ci
        JOIN FETCH ci.course c
        LEFT JOIN FETCH aa.selectedOption so
        LEFT JOIN FETCH q.image
        LEFT JOIN FETCH q.audio
        WHERE a.user.id = :userId
          AND aa.isCorrect = false
          AND (:courseId IS NULL OR c.id = :courseId)
          AND (:sectionCode IS NULL OR ci.sectionCode = :sectionCode)
          AND (:tag IS NULL OR q.tag = :tag)
        ORDER BY aa.createdAt DESC
    """)
    List<AttemptAnswer> findWrongAnswersByUser(
        @Param("userId") String userId,
        @Param("courseId") String courseId,
        @Param("sectionCode") String sectionCode,
        @Param("tag") String tag
    );
}