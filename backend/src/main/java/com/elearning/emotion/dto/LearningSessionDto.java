package com.elearning.emotion.dto;

import com.elearning.emotion.entity.LearningSession;

import java.time.LocalDateTime;

public record LearningSessionDto(
        String id,
        String contentItemId,
        String status,
        Boolean hasCameraPermission,
        String consentVersion,
        LocalDateTime consentAt,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Float focusScore
) {
    public static LearningSessionDto from(LearningSession s) {
        return new LearningSessionDto(
                s.getId(),
                s.getContentItem().getId(),
                s.getStatus(),
                s.getHasCameraPermission(),
                s.getConsentVersion(),
                s.getConsentAt(),
                s.getStartTime(),
                s.getEndTime(),
                s.getFocusScore()
        );
    }
}
