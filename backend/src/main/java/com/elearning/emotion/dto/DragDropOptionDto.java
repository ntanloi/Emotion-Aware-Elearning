package com.elearning.emotion.dto;

import com.elearning.emotion.entity.DragDropOption;

/**
 * blankOrder: vi tri o trong {{n}} ma the nay la dap an dung — CHI tra ve khi giao vien xem lai
 * (forTeacher) hoac sau khi hoc vien da kiem tra dap an. Ben hoc vien lam bai (forStudent) PHAI
 * truyen null cho MOI the (ke ca the dung) de khong lo dap an truoc khi keo tha.
 */
public record DragDropOptionDto(String id, Integer displayOrder, String text, Integer blankOrder) {
    public static DragDropOptionDto forTeacher(DragDropOption o) {
        return new DragDropOptionDto(o.getId(), o.getDisplayOrder(), o.getText(), o.getBlankOrder());
    }

    public static DragDropOptionDto forStudent(DragDropOption o) {
        return new DragDropOptionDto(o.getId(), o.getDisplayOrder(), o.getText(), null);
    }
}
