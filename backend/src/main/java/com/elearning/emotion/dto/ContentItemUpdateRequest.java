package com.elearning.emotion.dto;

/**
 * Sua 1 hoat dong da tao. Field null = KHONG ghi de (giu nguyen gia tri cu) - cung quy uoc voi
 * CourseUpdateRequest. groupId co the gui rong-string "" de CHUYEN hoat dong ra khoi Nhom hien tai
 * (thanh ungrouped) - xem ContentItemService.update().
 */
public record ContentItemUpdateRequest(
        String title,
        Integer timeLimitMinutes,
        String videoMediaId,
        String bodyHtml,
        String groupId,
        Boolean isPreview,
        Integer previewDurationSeconds
) {}
