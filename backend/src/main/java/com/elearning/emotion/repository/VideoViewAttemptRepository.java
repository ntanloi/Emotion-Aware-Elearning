package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VideoViewAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VideoViewAttemptRepository extends JpaRepository<VideoViewAttempt, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from VideoViewAttempt a where a.id = :id")
    Optional<VideoViewAttempt> lockById(@Param("id") String id);

    @Query("select a from VideoViewAttempt a where a.userId = :u and a.contentItemId = :c and a.status = 'OPEN' and a.lastActivityAt >= :since order by a.createdAt desc")
    List<VideoViewAttempt> findOpen(@Param("u") String userId, @Param("c") String contentItemId, @Param("since") LocalDateTime since);

    @Modifying
    @Query("update VideoViewAttempt a set a.status = 'EXPIRED', a.finalizedAt = :now where a.status = 'OPEN' and a.lastActivityAt < :limit")
    int expireOpenBefore(@Param("limit") LocalDateTime limit, @Param("now") LocalDateTime now);

    @Query(value = "select count(distinct a.content_item_id) from video_view_attempts a "
            + "join reward_escrow_videos v on v.content_item_id = a.content_item_id and v.escrow_id = :escrowId "
            + "join content_items c on c.id = a.content_item_id "
            + "where a.user_id = :userId and a.status = 'VALID' and a.finalized_at >= :since", nativeQuery = true)
    int countValidVideos(@Param("escrowId") String escrowId, @Param("userId") String userId,
                         @Param("since") LocalDateTime since);

    List<VideoViewAttempt> findByUserIdOrderByCreatedAtDesc(String userId);

    @Modifying
    @Query(value = "delete a from video_view_attempts a where a.finalized_at < :cutoff and not exists ("
            + "select 1 from reward_escrows e join reward_escrow_videos v on v.escrow_id = e.id "
            + "where e.status = 'HOLDING' and e.user_id = a.user_id and v.content_item_id = a.content_item_id)",
            nativeQuery = true)
    int purgeSettledAttempts(@Param("cutoff") LocalDateTime cutoff);
}
