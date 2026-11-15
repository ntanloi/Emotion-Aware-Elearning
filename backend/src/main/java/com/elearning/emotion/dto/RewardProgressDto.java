package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RewardProgressDto(
        String escrowId,
        String courseId,
        String courseTitle,
        BigDecimal amount,
        String status,
        int validVideos,
        int totalVideos,
        int requiredVideos,
        LocalDateTime holdingUntil,
        List<VideoRewardStatusDto> videos
) {}
