package com.elearning.emotion.dto;

import com.elearning.emotion.entity.AdaptiveSuggestion;
import java.time.LocalDateTime;

public record AdaptiveSuggestionDto(
        String id,
        String triggerType,
        String message,
        Integer videoSegmentStart,
        Integer videoSegmentEnd,
        String actionType,
        LocalDateTime triggeredAt,
        Boolean wasAccepted
) {
    public static AdaptiveSuggestionDto from(AdaptiveSuggestion s, String message, String actionType) {
        return new AdaptiveSuggestionDto(
                s.getId(),
                s.getTriggerType(),
                message,
                s.getVideoSegmentStart(),
                s.getVideoSegmentEnd(),
                actionType,
                s.getTriggeredAt(),
                s.getWasAccepted()
        );
    }
}
