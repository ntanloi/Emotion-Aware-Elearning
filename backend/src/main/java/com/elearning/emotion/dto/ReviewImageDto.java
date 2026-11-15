package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ReviewImage;

/**
 * DTO ảnh đính kèm trong đánh giá khóa học (Phase 0 - Phase 3)
 */
public record ReviewImageDto(
        String id,
        String mediaAssetId,
        String url,
        int sortOrder,
        boolean isHidden
) {
    public static ReviewImageDto from(ReviewImage ri) {
        if (ri == null) return null;
        return new ReviewImageDto(
                ri.getId(),
                ri.getMediaAsset().getId(),
                ri.getMediaAsset().getUrl(),
                ri.getSortOrder(),
                Boolean.TRUE.equals(ri.getIsHidden())
        );
    }
}
