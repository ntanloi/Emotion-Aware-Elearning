package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentAnalysisCache;
import com.elearning.emotion.entity.ContentAnalysisCacheId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentAnalysisCacheRepository extends JpaRepository<ContentAnalysisCache, ContentAnalysisCacheId> {
}
