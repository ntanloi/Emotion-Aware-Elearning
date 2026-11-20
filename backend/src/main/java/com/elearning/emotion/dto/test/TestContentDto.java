package com.elearning.emotion.dto.test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record TestContentDto(
        String testAttemptId,
        String testId,
        String title,
        String description,
        String mode,
        String feedbackMode,
        Integer timeLimitSeconds,
        LocalDateTime startedAt,
        LocalDateTime deadlineAt,
        /** Số giây còn lại tính theo đồng hồ server (null nếu không giới hạn thời gian). Tránh lệch múi giờ giữa server và trình duyệt. */
        Long remainingSeconds,
        String status,
        List<TestPartContentDto> parts,
        Map<String, String> draftAnswers
) {}