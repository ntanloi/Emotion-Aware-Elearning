package com.elearning.emotion.dto;

import java.util.List;

/**
 * Cay noi dung day du cua 1 muc sidebar (course + sectionCode): cac Nhom hoat dong
 * (ContentGroup, co the rong neu chua tao Nhom nao) + cac hoat dong nam TRUC THUOC THANG
 * muc sidebar (khong thuoc Nhom nao) - tuong thich nguoc voi du lieu cu truoc V4 (toan bo
 * la ungroupedItems).
 */
public record SectionContentTreeDto(
        List<ContentGroupDto> groups,
        List<ContentItemDto> ungroupedItems
) {
}
