package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ToeicTestCreateCustomRequest(
        @NotBlank(message = "Tiêu đề đề thi không được để trống")
        @Size(max = 200, message = "Tiêu đề không quá 200 ký tự")
        String title,

        String description,

        Integer listeningMinutes,

        Integer readingMinutes,

        @NotEmpty(message = "Vui lòng chọn ít nhất một phần thi (Part)")
        List<Integer> selectedParts
) {}
