package com.elearning.emotion.dto.live;

public record LiveAlertEventDto(
        String alertId,
        String contentItemId,
        String lessonTitle,
        int startSec,
        int endSec,
        double negativeRatio,
        long nStudents
) {}
