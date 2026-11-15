package com.elearning.emotion.dto;

public record VideoRewardStatusDto(
        String contentItemId,
        String title,
        String status, // VALID | IN_PROGRESS | NOT_STARTED
        Double coveragePercent,
        Double badPercent
) {}
