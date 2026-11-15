package com.elearning.emotion.dto.live;

public record StudentAttentionDto(
        String alias,
        String state,
        long sinceSec,
        Float videoSec
) {}
