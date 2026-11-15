package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, String> {

    List<ReviewImage> findByReviewIdOrderBySortOrderAsc(String reviewId);

    boolean existsByMediaAssetId(String mediaAssetId);

    @Query("SELECT ri.mediaAsset.id FROM ReviewImage ri WHERE ri.mediaAsset.id IN :mediaAssetIds")
    Set<String> findLinkedMediaAssetIds(@Param("mediaAssetIds") Collection<String> mediaAssetIds);
}
