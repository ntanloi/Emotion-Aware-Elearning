package com.elearning.emotion.dto.report;

public record TimelineBucketDto(
        int bucketIndex,
        int startSecond,
        int endSecond,
        long totalSamples,
        long engagedCount,
        long interestedCount,
        long confusedCount,
        long boredCount,
        long neutralCount,
        long noFaceCount,
        Double focusScore,
        String dominantEmotion
) {}
