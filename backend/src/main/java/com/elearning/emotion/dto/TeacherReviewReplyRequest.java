package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeacherReviewReplyRequest(
        @NotBlank(message = "Nội dung phản hồi không được để trống")
        @Size(max = 2000, message = "Nội dung phản hồi tối đa 2000 ký tự")
        String reply
) {
}
