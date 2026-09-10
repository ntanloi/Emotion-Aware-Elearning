package com.elearning.emotion.dto;

import java.util.List;

/** Danh sách groupId theo đúng thứ tự mới muốn hiển thị (kéo-thả) */
public record ContentGroupReorderRequest(List<String> orderedGroupIds) {}
