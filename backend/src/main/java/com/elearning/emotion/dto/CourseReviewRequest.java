package com.elearning.emotion.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CourseReviewRequest(
        @NotNull(message = "Vui lòng chọn số sao đánh giá")
        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer rating,

        @Size(max = 2000, message = "Bình luận tối đa 2000 ký tự")
        String comment,

        @Size(max = 3, message = "Tối đa đính kèm 3 hình ảnh")
        List<String> imageMediaIds,

        Boolean allowFeature
) {
}
