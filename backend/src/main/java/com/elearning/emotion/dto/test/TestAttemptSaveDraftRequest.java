package com.elearning.emotion.dto.test;

import java.util.Map;

public record TestAttemptSaveDraftRequest(
        Map<String, String> answers
) {}
