package com.elearning.emotion.repository;

import com.elearning.emotion.entity.SessionBucketStats;
import com.elearning.emotion.entity.SessionBucketStatsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SessionBucketStatsRepository extends JpaRepository<SessionBucketStats, SessionBucketStatsId> {

    public interface BucketAggProjection {
        Integer getBucketIndex();
        Long getStudentCount();
        Long getTotalSamples();
        Long getConfusedCount();
        Long getBoredCount();
        Long getEngagedCount();
        Long getInterestedCount();
        Long getNeutralCount();
        Long getNoFaceCount();
    }

    public interface SessionTotalsProjection {
        Long getTotal();
        Long getEngaged();
        Long getInterested();
        Long getNeutral();
        Long getConfused();
        Long getBored();
        Long getNoFace();
    }

    public interface StudentBucketRow {
        String getUserId();
        Integer getBucketIndex();
        Long getTotal();
        Long getConfused();
        Long getBored();
        Long getNoFace();
    }

    @Query(value = """
        SELECT user_id AS userId, bucket_index AS bucketIndex,
               SUM(n_total) AS total, SUM(n_confused) AS confused,
               SUM(n_bored) AS bored, SUM(n_noface) AS noFace
        FROM session_bucket_stats
        WHERE content_item_id = :contentItemId
        GROUP BY user_id, bucket_index
        ORDER BY user_id, bucket_index
        """, nativeQuery = true)
    List<StudentBucketRow> findStudentBuckets(@Param("contentItemId") String contentItemId);

    @Query(value = """
        SELECT bucket_index AS bucketIndex,
               COUNT(DISTINCT user_id) AS studentCount,
               SUM(n_total) AS totalSamples,
               SUM(n_confused) AS confusedCount,
               SUM(n_bored) AS boredCount,
               SUM(n_engaged) AS engagedCount,
               SUM(n_interested) AS interestedCount,
               SUM(n_neutral) AS neutralCount,
               SUM(n_noface) AS noFaceCount
        FROM session_bucket_stats
        WHERE content_item_id = :contentItemId
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
        """, nativeQuery = true)
    List<BucketAggProjection> aggregateByContentItemId(@Param("contentItemId") String contentItemId);

    @Query(value = """
        SELECT bucket_index AS bucketIndex,
               1 AS studentCount,
               SUM(n_total) AS totalSamples,
               SUM(n_confused) AS confusedCount,
               SUM(n_bored) AS boredCount,
               SUM(n_engaged) AS engagedCount,
               SUM(n_interested) AS interestedCount,
               SUM(n_neutral) AS neutralCount,
               SUM(n_noface) AS noFaceCount
        FROM session_bucket_stats
        WHERE user_id = :userId AND content_item_id = :contentItemId
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
        """, nativeQuery = true)
    List<BucketAggProjection> aggregateByUserIdAndContentItemId(@Param("userId") String userId, @Param("contentItemId") String contentItemId);

    @Query(value = """
        SELECT bucket_index AS bucketIndex,
               1 AS studentCount,
               SUM(n_total) AS totalSamples,
               SUM(n_confused) AS confusedCount,
               SUM(n_bored) AS boredCount,
               SUM(n_engaged) AS engagedCount,
               SUM(n_interested) AS interestedCount,
               SUM(n_neutral) AS neutralCount,
               SUM(n_noface) AS noFaceCount
        FROM session_bucket_stats
        WHERE session_id = :sessionId
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
        """, nativeQuery = true)
    List<BucketAggProjection> aggregateBySessionId(@Param("sessionId") String sessionId);

    @Query(value = """
        SELECT COALESCE(SUM(n_total), 0) AS total,
               COALESCE(SUM(n_engaged), 0) AS engaged,
               COALESCE(SUM(n_interested), 0) AS interested,
               COALESCE(SUM(n_neutral), 0) AS neutral,
               COALESCE(SUM(n_confused), 0) AS confused,
               COALESCE(SUM(n_bored), 0) AS bored,
               COALESCE(SUM(n_noface), 0) AS noFace
        FROM session_bucket_stats
        WHERE session_id = :sessionId
        """, nativeQuery = true)
    SessionTotalsProjection getTotalsBySessionId(@Param("sessionId") String sessionId);

    @Query(value = """
        SELECT COALESCE(SUM(s.n_total), 0) AS total,
               COALESCE(SUM(s.n_engaged), 0) AS engaged,
               COALESCE(SUM(s.n_interested), 0) AS interested,
               COALESCE(SUM(s.n_neutral), 0) AS neutral,
               COALESCE(SUM(s.n_confused), 0) AS confused,
               COALESCE(SUM(s.n_bored), 0) AS bored,
               COALESCE(SUM(s.n_noface), 0) AS noFace
        FROM session_bucket_stats s
        JOIN content_items c ON s.content_item_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE co.teacher_id = :teacherId
        """, nativeQuery = true)
    SessionTotalsProjection getTotalsByTeacherId(@Param("teacherId") String teacherId);

    long countByUserId(String userId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query("DELETE FROM SessionBucketStats s WHERE s.userId = :userId")
    int deleteByUserId(@Param("userId") String userId);
}
