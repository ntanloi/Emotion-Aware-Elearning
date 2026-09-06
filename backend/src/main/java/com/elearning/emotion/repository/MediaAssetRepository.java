package com.elearning.emotion.repository;

import com.elearning.emotion.entity.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, String> {
}
