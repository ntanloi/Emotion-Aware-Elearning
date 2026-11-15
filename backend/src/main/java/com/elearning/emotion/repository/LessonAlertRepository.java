package com.elearning.emotion.repository;

import com.elearning.emotion.entity.LessonAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonAlertRepository extends JpaRepository<LessonAlert, String> {

    Optional<LessonAlert> findByContentItemIdAndStartSec(String contentItemId, Integer startSec);

    @Query("""
        SELECT a FROM LessonAlert a
        WHERE a.contentItem.id = :contentItemId
          AND a.startSec < :endSec
          AND a.endSec > :startSec
        ORDER BY a.startSec ASC
        """)
    List<LessonAlert> findOverlappingAlerts(
            @Param("contentItemId") String contentItemId,
            @Param("startSec") Integer startSec,
            @Param("endSec") Integer endSec
    );

    @Query("""
        SELECT a FROM LessonAlert a
        WHERE a.contentItem.id = :contentItemId
          AND a.startSec < :endSec
          AND a.endSec > :startSec
          AND a.status IN ('OPEN', 'ACKED')
        ORDER BY a.startSec ASC
        """)
    List<LessonAlert> findOverlappingActiveAlerts(
            @Param("contentItemId") String contentItemId,
            @Param("startSec") Integer startSec,
            @Param("endSec") Integer endSec
    );

    List<LessonAlert> findByContentItemIdAndStatusIn(String contentItemId, List<String> statuses);

    List<LessonAlert> findByContentItemIdOrderByStartSecAsc(String contentItemId);

    List<LessonAlert> findByContentItemIdAndStatusOrderByStartSecAsc(String contentItemId, String status);

    @Query("""
        SELECT a FROM LessonAlert a
        JOIN a.contentItem c
        JOIN c.course co
        WHERE co.teacher.id = :teacherId
        ORDER BY a.createdAt DESC
        """)
    List<LessonAlert> findByTeacherId(@Param("teacherId") String teacherId);

    @Query("""
        SELECT a FROM LessonAlert a
        JOIN a.contentItem c
        JOIN c.course co
        WHERE co.teacher.id = :teacherId AND (:status IS NULL OR a.status = :status)
        ORDER BY a.createdAt DESC
        """)
    List<LessonAlert> findByTeacherIdAndStatus(@Param("teacherId") String teacherId, @Param("status") String status);

    @Query("""
        SELECT COUNT(a) FROM LessonAlert a
        JOIN a.contentItem c
        JOIN c.course co
        WHERE co.teacher.id = :teacherId AND a.status = 'OPEN'
        """)
    long countOpenAlertsByTeacherId(@Param("teacherId") String teacherId);

    @Query("""
        SELECT a.contentItem.id, COUNT(a)
        FROM LessonAlert a
        WHERE a.contentItem.id IN :contentItemIds AND a.status = 'OPEN'
        GROUP BY a.contentItem.id
        """)
    List<Object[]> countOpenAlertsByContentItemIds(@Param("contentItemIds") List<String> contentItemIds);
}
