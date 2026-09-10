package com.elearning.emotion.dto;

/**
 * Sửa 1 hoạt động đã tạo. Field null = KHÔNG ghi đè (giữ nguyên giá trị cũ) — cùng quy ước với
 * CourseUpdateRequest. groupId có thể gửi rỗng-string "" để CHUYỂN hoạt động ra khỏi Nhóm hiện tại
 * (thành ungrouped) — xem ContentItemService.update().
 */
public record ContentItemUpdateRequest(
        String title,
        Integer timeLimitMinutes,
        String videoMediaId,
        String bodyHtml,
        String groupId
) {}
