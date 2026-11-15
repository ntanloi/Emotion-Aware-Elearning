package com.elearning.emotion.dto;

import java.util.List;

public record VideoEmotionTimelineDto(
        String contentItemId,
        String lessonTitle,
        String courseTitle,
        String videoUrl,
        Integer videoDurationSec,
        long totalSessions,
        double avgFocusScore,
        String peakConfusedTimestamp,
        double peakConfusedPercent,
        String peakBoredTimestamp,
        double peakBoredPercent,
        List<TimelineSegmentDto> segments,
        List<String> pedagogicalRecommendations,
        Integer minStudentsRequired
) {
    // Constructor tương thích ngược 13 tham số
    public VideoEmotionTimelineDto(
            String contentItemId,
            String lessonTitle,
            String courseTitle,
            String videoUrl,
            Integer videoDurationSec,
            long totalSessions,
            double avgFocusScore,
            String peakConfusedTimestamp,
            double peakConfusedPercent,
            String peakBoredTimestamp,
            double peakBoredPercent,
            List<TimelineSegmentDto> segments,
            List<String> pedagogicalRecommendations
    ) {
        this(contentItemId, lessonTitle, courseTitle, videoUrl, videoDurationSec,
                totalSessions, avgFocusScore, peakConfusedTimestamp, peakConfusedPercent,
                peakBoredTimestamp, peakBoredPercent, segments, pedagogicalRecommendations, 5);
    }
    public record TimelineSegmentDto(
            int startSec,
            int endSec,
            String timeLabel,
            long totalSamples,
            long studentCount,
            double confusedPercent,
            double boredPercent,
            double engagedPercent,
            double interestedPercent,
            double neutralPercent,
            double noFacePercent,
            boolean isProblematic,
            boolean hasEnoughData
    ) {
        // Constructor tương thích ngược
        public TimelineSegmentDto(
                int startSec, int endSec, String timeLabel, long totalSamples,
                double confusedPercent, double boredPercent, double engagedPercent,
                double interestedPercent, double neutralPercent, double noFacePercent,
                boolean isProblematic
        ) {
            this(startSec, endSec, timeLabel, totalSamples, 0L,
                    confusedPercent, boredPercent, engagedPercent, interestedPercent,
                    neutralPercent, noFacePercent, isProblematic, false);
        }
    }
}
