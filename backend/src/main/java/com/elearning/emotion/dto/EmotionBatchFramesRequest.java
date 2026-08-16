package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record EmotionBatchFramesRequest(
        @NotEmpty @Size(max = 6, message = "Toi da 6 anh/lo theo BR-04")
        List<String> images // base64
) {}
