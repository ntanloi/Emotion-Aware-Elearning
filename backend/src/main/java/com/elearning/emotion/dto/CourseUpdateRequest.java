package com.elearning.emotion.dto;

import java.math.BigDecimal;

/** Cac field null se KHONG bi ghi de - xem CourseService.update() */
public record CourseUpdateRequest(
        String title,
        String description,
        String level,
        String profile,
        Integer durationHours,
        BigDecimal price,
        BigDecimal originalPrice,
        String coverMediaId
) {}
