package com.elearning.emotion.dto;

/**
 * Phản hồi sau khi tải ảnh đánh giá thành công (Phase 0)
 */
public record ReviewImageUploadResponse(
        String mediaAssetId,
        String url
) {
}
