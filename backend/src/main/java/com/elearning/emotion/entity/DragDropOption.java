package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/**
 * 1 dong = 1 "the" trong ngan keo (word bank) thuoc ve 1 cau hoi keo-tha
 * (question.questionKind = DRAG_DROP). Question.promptText chua cau/doan van day du, cac vi
 * tri o trong duoc danh dau bang token {{1}}, {{2}}, ...
 *
 * - blankOrder != null: the la dap an DUNG cho o trong {{blankOrder}}.
 * - blankOrder == null: the la moi (distractor), khong khop o trong nao ca.
 *
 * displayOrder chi dung de sap xep thu tu hien thi trong ngan keo (khong lien quan den vi tri
 * o trong), giup UI on dinh giua cac lan tai lai trang.
 */
@Entity
@Table(name = "drag_drop_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DragDropOption {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    /** Thu tu hien thi trong ngan keo (khong phai vi tri o trong) */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    /** Vi tri token {{n}} ma the nay la dap an dung (null = the moi/distractor) */
    @Column(name = "blank_order")
    private Integer blankOrder;

    @Column(name = "text", nullable = false, length = 255)
    private String text;
}
