package com.elearning.emotion.dto;

import java.time.LocalDateTime;

public record TeacherStudentProgressDto(
        String enrollmentId,
        String studentId,
        String studentName,
        String studentEmail,
        String courseId,
        String courseTitle,
        LocalDateTime enrolledAt,
        Float progressPercent
) {}
