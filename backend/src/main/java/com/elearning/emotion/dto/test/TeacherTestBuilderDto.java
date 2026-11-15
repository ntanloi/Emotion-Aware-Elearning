package com.elearning.emotion.dto.test;

import java.util.List;

public record TeacherTestBuilderDto(
        ToeicTestDto test,
        List<TeacherTestPartDetailDto> parts
) {}
