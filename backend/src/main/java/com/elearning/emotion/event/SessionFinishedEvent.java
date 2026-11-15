package com.elearning.emotion.event;

import java.time.LocalDate;

public record SessionFinishedEvent(
        String sessionId,
        String userId,
        LocalDate date
) {}
