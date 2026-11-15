package com.elearning.emotion.dto.live;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record LiveSnapshotDto(
        LocalDateTime at,
        List<LessonLiveDto> lessons
) {}
