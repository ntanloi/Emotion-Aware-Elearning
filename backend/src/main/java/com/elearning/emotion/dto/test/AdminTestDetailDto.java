package com.elearning.emotion.dto.test;

import java.util.List;

public record AdminTestDetailDto(
        ToeicTestDto test,
        List<TestPartContentDto> parts
) {}
