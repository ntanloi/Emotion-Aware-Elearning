package com.elearning.emotion.dto.live;

public record HotSegmentDto(
        int startSec,
        int endSec,
        double negativeRatio
) {}
