package com.elearning.emotion.event;

import com.elearning.emotion.entity.LessonAlert;

public record LessonAlertCreatedEvent(
        LessonAlert alert,
        String teacherId,
        String lessonTitle
) {}
