package com.elearning.emotion.dto;

public record TeacherEmotionLessonDto(
        String lessonId,
        String lessonTitle,
        String courseId,
        String courseTitle,
        String sectionCode,
        String sectionName,
        String groupTitle,
        double avgFocus,
        long sessionCount,
        String statusLabel,
        long alertCount
) {
    // Constructor tương thích ngược
    public TeacherEmotionLessonDto(
            String lessonId, String lessonTitle, String courseId, String courseTitle,
            String sectionCode, String sectionName, String groupTitle,
            double avgFocus, long sessionCount, String statusLabel
    ) {
        this(lessonId, lessonTitle, courseId, courseTitle, sectionCode, sectionName, groupTitle, avgFocus, sessionCount, statusLabel, 0L);
    }
}
