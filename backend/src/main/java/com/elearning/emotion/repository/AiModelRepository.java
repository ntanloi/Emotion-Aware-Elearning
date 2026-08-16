package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AiModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiModelRepository extends JpaRepository<AiModel, String> {
}
