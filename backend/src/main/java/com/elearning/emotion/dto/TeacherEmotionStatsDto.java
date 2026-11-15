package com.elearning.emotion.dto;

import java.util.List;

public record TeacherEmotionStatsDto(
        double avgFocusScore,
        long totalSessions,
        int happyPercent,
        int neutralPercent,
        int confusedPercent,
        int boredPercent,
        List<TeacherEmotionLessonDto> lessonStats
) {}
