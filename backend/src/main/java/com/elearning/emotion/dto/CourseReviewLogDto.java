package com.elearning.emotion.dto;

import com.elearning.emotion.entity.CourseReviewLog;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class CourseReviewLogDto {
    String id;
    String courseId;
    String actorId;
    String actorName;
    String actorEmail;
    String action;
    String fromStatus;
    String toStatus;
    String note;
    String checklist;
    LocalDateTime createdAt;

    public static CourseReviewLogDto from(CourseReviewLog log) {
        return CourseReviewLogDto.builder()
                .id(log.getId())
                .courseId(log.getCourse().getId())
                .actorId(log.getActor().getId())
                .actorName(log.getActor().getFullName())
                .actorEmail(log.getActor().getEmail())
                .action(log.getAction())
                .fromStatus(log.getFromStatus())
                .toStatus(log.getToStatus())
                .note(log.getNote())
                .checklist(log.getChecklist())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
