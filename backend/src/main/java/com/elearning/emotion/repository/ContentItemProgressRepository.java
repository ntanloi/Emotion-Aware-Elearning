package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentItemProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ContentItemProgressRepository extends JpaRepository<ContentItemProgress, String> {
    List<ContentItemProgress> findByUserIdAndContentItemId(String userId, String contentItemId);
    Optional<ContentItemProgress> findByUserIdAndContentItemIdAndPracticeType(
            String userId, String contentItemId, String practiceType);
    List<ContentItemProgress> findByUserId(String userId);
    List<ContentItemProgress> findByUserIdAndContentItemIdIn(String userId, Collection<String> contentItemIds);
}
