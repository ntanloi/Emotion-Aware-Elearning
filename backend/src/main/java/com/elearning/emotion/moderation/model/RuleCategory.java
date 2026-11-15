package com.elearning.emotion.moderation.model;

public enum RuleCategory {
    STRUCTURE,  // Cấu trúc khóa học, điều kiện gửi duyệt (STR)
    CONTENT,    // Quy chuẩn câu hỏi, lựa chọn (CM, P1-P7)
    LANGUAGE,   // Từ vựng, ngữ pháp, chính tả (VOC, GRM, DIC)
    SAFETY,     // An toàn nội dung, từ tục, lừa đảo (TXT)
    SECURITY,   // Mã độc, script độc hại (TXT)
    COPYRIGHT,  // Dấu hiệu vi phạm bản quyền (TXT, MED, DUP)
    SYSTEM      // Lỗi nội bộ hoặc công cụ ngoài không phản hồi
}
