package com.elearning.emotion.dto.test;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BankImportRequest(
        @NotEmpty(message = "Danh sách câu hỏi cần thêm không được rỗng")
        List<String> questionIds
) {}
