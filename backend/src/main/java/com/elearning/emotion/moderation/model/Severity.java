package com.elearning.emotion.moderation.model;

public enum Severity {
    BLOCKER,  // Chặn gửi duyệt (chỉ dùng cho nhóm STR)
    ERROR,    // Lỗi vi phạm nghiệp vụ, kiểm duyệt viên bắt buộc phải xử lý
    WARNING,  // Cảnh báo cần lưu ý, không chặn duyệt
    INFO,     // Thông tin thống kê hoặc gợi ý tối ưu
    CONTEXT   // Dấu hiệu ngữ cảnh cần LLM xác nhận
}
