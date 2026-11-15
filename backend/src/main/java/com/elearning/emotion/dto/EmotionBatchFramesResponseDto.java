package com.elearning.emotion.dto;

import com.elearning.emotion.service.VideoViewAttemptService.AttemptSnapshot;

import java.util.List;
import java.util.Map;

public record EmotionBatchFramesResponseDto(
        List<EmotionLogDto> logs,
        AdaptiveSuggestionDto suggestion,
        Map<String, Object> debug,   // diem 4 trang thai + dau hieu cua khung moi nhat (chi de hien thanh cam xuc khi test)
        String sessionStatus,
        AttemptSnapshot attempt
) {
    public EmotionBatchFramesResponseDto(List<EmotionLogDto> logs, AdaptiveSuggestionDto suggestion, Map<String, Object> debug) {
        this(logs, suggestion, debug, null, null);
    }

    public EmotionBatchFramesResponseDto(List<EmotionLogDto> logs, AdaptiveSuggestionDto suggestion) {
        this(logs, suggestion, null, null, null);
    }

    public EmotionBatchFramesResponseDto(List<EmotionLogDto> logs) {
        this(logs, null, null, null, null);
    }
}
