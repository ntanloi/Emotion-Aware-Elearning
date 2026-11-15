package com.elearning.emotion.dto.report;

import java.util.List;

public record StudentLessonEmotionDetailDto(
        String contentItemId,
        String lessonTitle,
        String courseId,
        String courseTitle,
        Integer videoDurationSeconds,
        Double overallFocusScore,
        Double presenceRate,
        Double engagedPercent,
        Double interestedPercent,
        Double confusedPercent,
        Double boredPercent,
        List<TimelineBucketDto> timeline,
        List<ReviewSegmentDto> reviewSegments,
        int suggestionsCount,
        int acceptedSuggestionsCount,
        List<String> recommendationNotes
) {}
