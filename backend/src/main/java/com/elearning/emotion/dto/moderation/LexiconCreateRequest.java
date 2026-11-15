package com.elearning.emotion.dto.moderation;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LexiconCreateRequest {
    @NotBlank(message = "Danh mục không được để trống")
    private String category;

    @NotBlank(message = "Kiểu khớp không được để trống (WORD, PHRASE, REGEX)")
    private String matchType;

    @NotBlank(message = "Từ khóa/Mẫu không được để trống")
    private String pattern;

    @NotBlank(message = "Mức độ nghiêm trọng không được để trống (ERROR, WARNING, INFO, CONTEXT)")
    private String severity;

    private String lang = "vi";
    private String scope = "ALL";
    private Boolean active = true;
    private String note;
}
