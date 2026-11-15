package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ToeicTestPublishRequest(
        @NotBlank(message = "sourceCourseId khong duoc de trong")
        String sourceCourseId,

        @NotBlank(message = "title khong duoc de trong")
        String title,

        String description,

        @NotEmpty(message = "Danh sach parts khong duoc de trong")
        List<ToeicTestPublishPartRequest> parts,

        Integer listeningMinutes,
        Integer readingMinutes,
        String originTestId
) {}
