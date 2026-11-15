package com.elearning.emotion.dto.live;

import java.util.List;
import java.util.Map;

public record LessonLiveDto(
        String contentItemId,
        String title,
        int viewers,
        Map<String, Integer> distribution,
        List<StudentAttentionDto> attention,
        HotSegmentDto hotSegment
) {}
