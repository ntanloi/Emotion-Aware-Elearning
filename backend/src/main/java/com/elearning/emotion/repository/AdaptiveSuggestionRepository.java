package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AdaptiveSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AdaptiveSuggestionRepository extends JpaRepository<AdaptiveSuggestion, String> {
    long countBySessionId(String sessionId);
    long countBySessionIdAndWasAcceptedTrue(String sessionId);

    Optional<AdaptiveSuggestion> findTopBySessionIdOrderByTriggeredAtDesc(String sessionId);

    List<AdaptiveSuggestion> findBySessionIdOrderByTriggeredAtAsc(String sessionId);
    List<AdaptiveSuggestion> findBySessionIdIn(java.util.Collection<String> sessionIds);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM AdaptiveSuggestion a WHERE a.session.user.id = :userId")
    long countByUserId(@org.springframework.data.repository.query.Param("userId") String userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(DISTINCT a.session.user.id) FROM AdaptiveSuggestion a " +
        "WHERE a.session.contentItem.id = :contentItemId " +
        "AND a.wasAccepted = true " +
        "AND a.triggerType = 'CONFUSED' " +
        "AND a.videoSegmentStart < :endSec AND a.videoSegmentEnd > :startSec"
    )
    long countAcceptedRewinds(
        @org.springframework.data.repository.query.Param("contentItemId") String contentItemId,
        @org.springframework.data.repository.query.Param("startSec") int startSec,
        @org.springframework.data.repository.query.Param("endSec") int endSec
    );

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM AdaptiveSuggestion a WHERE a.session.user.id = :userId")
    int deleteByUserId(@org.springframework.data.repository.query.Param("userId") String userId);
}

