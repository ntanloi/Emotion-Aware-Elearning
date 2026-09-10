package com.elearning.emotion.dto;

import java.math.BigDecimal;

/** Cac field null se KHONG bi ghi de - xem CourseService.update() */
public record CourseUpdateRequest(
        String title,
        String description,
        String level,
        Integer durationHours,
        BigDecimal price,
        BigDecimal originalPrice,
        String coverMediaId,
        String status // DRAFT | PUBLISHED | HIDDEN
) {}
