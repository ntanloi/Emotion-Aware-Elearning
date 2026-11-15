package com.elearning.emotion.dto.test;

import com.elearning.emotion.dto.AnswerSubmission;
import java.util.List;
import java.util.Map;

public record TestAttemptSubmitRequest(
        List<AnswerSubmission> answers,
        Map<String, String> answerMap
) {}
