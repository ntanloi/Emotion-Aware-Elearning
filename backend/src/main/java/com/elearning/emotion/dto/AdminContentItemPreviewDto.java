package com.elearning.emotion.dto;

import java.util.List;

public record AdminContentItemPreviewDto(
        String id,
        String courseId,
        String sectionCode,
        String groupId,
        String groupTitle,
        String type,
        String title,
        Integer orderIndex,
        Integer timeLimitMinutes,
        String videoUrl,
        String bodyHtml,
        List<PassageDto> passages,
        List<QuestionDto> questions
) {}
