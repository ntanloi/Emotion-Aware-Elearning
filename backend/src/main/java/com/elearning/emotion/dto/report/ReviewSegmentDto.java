package com.elearning.emotion.dto.report;

public record ReviewSegmentDto(
        int startSecond,
        int endSecond,
        String formattedTime,
        String reason,
        Double averageConfusion,
        Double averageBoredom
) {}
