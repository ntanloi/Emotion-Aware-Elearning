package com.elearning.emotion.dto;

import java.util.List;

/** Danh sách contentItemId theo đúng thứ tự mới muốn hiển thị (kéo-thả), trong CÙNG 1 mục sidebar hoặc CÙNG 1 Nhóm */
public record ContentItemReorderRequest(List<String> orderedItemIds) {}
