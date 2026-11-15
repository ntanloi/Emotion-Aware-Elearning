package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record EmotionBatchFramesRequest(
        @NotEmpty @Size(max = 6, message = "Toi da 6 anh/lo theo BR-04")
        List<String> images, // base64
        Float videoTimeSec,
        Double playbackRate,
        Integer videoDurationSec
) {
    public EmotionBatchFramesRequest(List<String> images) {
        this(images, null, null, null);
    }

    public EmotionBatchFramesRequest(List<String> images, Float videoTimeSec) {
        this(images, videoTimeSec, null, null);
    }
}
