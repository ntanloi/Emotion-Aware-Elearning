package com.elearning.emotion.dto;

/**
 * Payload ghi nhận thời gian xem video của học viên.
 * watchedSeconds: mốc thời gian cao nhất đã xem (hoặc thời lượng tích lũy)
 * durationSeconds: tổng thời lượng của video
 */
public record VideoProgressRequest(
        Double watchedSeconds,
        Double durationSeconds
) {}
