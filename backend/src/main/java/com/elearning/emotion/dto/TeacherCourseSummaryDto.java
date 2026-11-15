package com.elearning.emotion.dto;

import java.math.BigDecimal;

public record TeacherCourseSummaryDto(
        String courseId,
        String title,
        String level,
        BigDecimal price,
        String status,
        long studentCount,
        BigDecimal totalRevenue
) {}
