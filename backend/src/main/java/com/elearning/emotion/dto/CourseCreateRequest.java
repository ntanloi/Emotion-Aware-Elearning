package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record CourseCreateRequest(
        @NotBlank String title,
        String description,
        String level,
        Integer durationHours,
        BigDecimal price,
        BigDecimal originalPrice,
        String coverMediaId
) {}
