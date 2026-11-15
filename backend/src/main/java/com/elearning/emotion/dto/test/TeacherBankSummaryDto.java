package com.elearning.emotion.dto.test;

import java.util.Map;

public record TeacherBankSummaryDto(
        Map<Integer, Integer> questionCountByPart,
        int totalQuestions
) {}
