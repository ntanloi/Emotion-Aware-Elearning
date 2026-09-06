package com.elearning.emotion.repository;

import com.elearning.emotion.entity.FlashcardProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FlashcardProgressRepository extends JpaRepository<FlashcardProgress, String> {
    List<FlashcardProgress> findByUserId(String userId);
    Optional<FlashcardProgress> findByUserIdAndWordId(String userId, String wordId);
}
