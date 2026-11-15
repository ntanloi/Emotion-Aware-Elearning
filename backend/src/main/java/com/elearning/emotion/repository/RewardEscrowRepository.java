package com.elearning.emotion.repository;

import com.elearning.emotion.entity.RewardEscrow;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RewardEscrowRepository extends JpaRepository<RewardEscrow, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from RewardEscrow e where e.id = :id")
    Optional<RewardEscrow> lockById(@Param("id") String id);

    @Query("select e.id from RewardEscrow e where e.status = 'HOLDING' and e.holdingUntil <= :now")
    List<String> findExpiredHoldingIds(@Param("now") LocalDateTime now);

    @Query("select e.id from RewardEscrow e where e.status = 'HOLDING' and e.userId = :userId and e.courseId = :courseId")
    List<String> findHoldingIds(@Param("userId") String userId, @Param("courseId") String courseId);

    Optional<RewardEscrow> findByOrderId(String orderId);

    @Modifying
    @Query("update RewardEscrow e set e.holdingUntil = :until where e.userId = :u and e.courseId = :c and e.status = 'HOLDING'")
    int syncHoldingUntil(@Param("u") String userId, @Param("c") String courseId, @Param("until") LocalDateTime until);

    @Query("select coalesce(sum(e.amount), 0) from RewardEscrow e where e.teacherId = :t and e.status = 'HOLDING'")
    BigDecimal sumHoldingByTeacher(@Param("t") String teacherId);

    @Query(value = "select count(*) from reward_escrow_videos v join content_items c on c.id = v.content_item_id "
            + "where v.escrow_id = :escrowId", nativeQuery = true)
    int countExistingVideos(@Param("escrowId") String escrowId);

    @Query(value = "select e.id from reward_escrows e join reward_escrow_videos v on v.escrow_id = e.id "
            + "where e.status = 'HOLDING' and e.user_id = :userId and v.content_item_id = :videoId", nativeQuery = true)
    List<String> findHoldingIdsForVideo(@Param("userId") String userId, @Param("videoId") String videoId);

    @Query("select e.id from RewardEscrow e where e.status = 'HOLDING'")
    List<String> findHoldingIdsForAnyHolding();

    @Query("select e from RewardEscrow e where e.userId = :userId order by e.createdAt desc")
    List<RewardEscrow> findAllByUserId(@Param("userId") String userId);

    @Query("select e from RewardEscrow e where e.userId = :userId and e.courseId = :courseId order by e.createdAt desc")
    List<RewardEscrow> findByUserIdAndCourseId(@Param("userId") String userId, @Param("courseId") String courseId);

    @Query("select coalesce(sum(e.amount), 0) from RewardEscrow e where e.status = 'HOLDING'")
    BigDecimal sumTotalHolding();

    Page<RewardEscrow> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("select coalesce(sum(e.amount), 0) from RewardEscrow e " +
           "where e.teacherId = :t and e.status = :status")
    BigDecimal sumByTeacherAndStatus(@Param("t") String teacherId, @Param("status") String status);

    @Query("select count(e) from RewardEscrow e where e.teacherId = :t and e.status = 'HOLDING'")
    long countHoldingByTeacher(@Param("t") String teacherId);

    @Query("select min(e.holdingUntil) from RewardEscrow e where e.teacherId = :t and e.status = 'HOLDING'")
    LocalDateTime minHoldingUntilByTeacher(@Param("t") String teacherId);

    /** Mỗi dòng: [RewardEscrow, tiêu đề khóa học]. */
    @Query(value = "select e, c.title from RewardEscrow e, Course c " +
                   "where c.id = e.courseId and e.teacherId = :t order by e.createdAt desc",
           countQuery = "select count(e) from RewardEscrow e where e.teacherId = :t")
    Page<Object[]> findTeacherEscrows(@Param("t") String teacherId, Pageable pageable);
}
