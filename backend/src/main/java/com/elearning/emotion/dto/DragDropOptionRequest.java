package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 1 the trong ngan keo khi giao vien tao/sua cau hoi DRAG_DROP.
 * - blankOrder != null: the la dap an DUNG cho o trong {{blankOrder}} trong promptText.
 * - blankOrder == null: the la moi (distractor).
 */
public record DragDropOptionRequest(
        @NotBlank String text,
        Integer blankOrder
) {}
