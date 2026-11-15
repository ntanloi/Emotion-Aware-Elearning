package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record TestAttemptStartRequest(
        @NotBlank(message = "testId khong duoc de trong")
        String testId,
        String mode, // FULL | PRACTICE
        List<Integer> selectedParts, // [1, 2, 5]
        String feedbackMode, // AFTER_TEST | IMMEDIATE
        Integer timeLimitSeconds // 7200, 0 (khong gioi han), hoac null (tu dong tinh)
) {}
