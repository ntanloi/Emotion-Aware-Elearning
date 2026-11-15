package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ModerationLexicon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ModerationLexiconRepository extends JpaRepository<ModerationLexicon, String>, JpaSpecificationExecutor<ModerationLexicon> {

    Optional<ModerationLexicon> findByCategoryAndMatchTypeAndPattern(String category, String matchType, String pattern);

    List<ModerationLexicon> findByActiveTrue();

    List<ModerationLexicon> findByCategory(String category);

    long countBySeverity(String severity);

    long countByActiveTrue();
}
