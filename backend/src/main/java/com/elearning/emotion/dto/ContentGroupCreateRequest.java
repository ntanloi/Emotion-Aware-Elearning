package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/** FR-TCH: tạo 1 Nhóm hoạt động (vd "Danh từ") trực tiếp trong 1 mục sidebar (course + sectionCode) */
public record ContentGroupCreateRequest(
        @NotBlank String courseId,
        @NotBlank String sectionCode,
        @NotBlank String title
) {}
