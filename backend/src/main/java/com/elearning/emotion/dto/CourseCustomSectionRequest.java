package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CourseCustomSectionRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 10) String icon   // null => dùng "📌"
) {}
