package com.elearning.emotion.dto;

import com.elearning.emotion.entity.MediaAsset;

public record MediaAssetDto(
        String id,
        String type,
        String url,
        String fileName,
        Integer durationSec
) {
    public static MediaAssetDto from(MediaAsset m) {
        return new MediaAssetDto(m.getId(), m.getType(), m.getUrl(), m.getFileName(), m.getDurationSec());
    }
}
