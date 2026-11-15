package com.elearning.emotion.dto;

import java.math.BigDecimal;
import java.util.List;

public record TeacherDashboardDto(
        BigDecimal totalRevenue,
        BigDecimal netRevenue,
        long totalStudents,
        long totalCourses,
        long publishedCourses,
        long paidOrdersCount,
        List<TeacherEnrollmentDto> recentEnrollments,
        List<TeacherStudentProgressDto> students,
        List<TeacherCourseSummaryDto> courses,
        TeacherEmotionStatsDto emotionStats
) {}
