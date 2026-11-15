package com.elearning.emotion.repository;

import com.elearning.emotion.entity.FlashcardProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FlashcardProgressRepository extends JpaRepository<FlashcardProgress, String> {
    List<FlashcardProgress> findByUserId(String userId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM FlashcardProgress p " +
           "JOIN FETCH p.word w " +
           "LEFT JOIN FETCH w.image " +
           "LEFT JOIN FETCH w.audioUk " +
           "LEFT JOIN FETCH w.audioUs " +
           "WHERE p.user.id = :userId")
    List<FlashcardProgress> findByUserIdWithMedia(@org.springframework.data.repository.query.Param("userId") String userId);

    Optional<FlashcardProgress> findByUserIdAndWordId(String userId, String wordId);
}
