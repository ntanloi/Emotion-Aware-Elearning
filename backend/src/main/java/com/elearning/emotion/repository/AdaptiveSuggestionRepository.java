package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AdaptiveSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdaptiveSuggestionRepository extends JpaRepository<AdaptiveSuggestion, String> {
}
