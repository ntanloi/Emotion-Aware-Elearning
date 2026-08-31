package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/**
 * 1 dong = 1 cho trong ("blank") gom 2 lua chon thuoc ve 1 "cau hoi chon tu trong doan van"
 * (question.questionKind = WORD_CHOICE). VD: "Families / Family" trong doan van Christmas.
 * Question.promptText chua doan van day du, cac vi tri blank duoc danh dau bang token
 * {{1}}, {{2}}, ... theo dung thu tu orderIndex cua cac WordChoicePair (1-based).
 */
@Entity
@Table(name = "word_choice_pairs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WordChoicePair {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    /** Vi tri token {{n}} trong promptText (1-based) - dung de render dung thu tu trong doan van */
    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(name = "option_a", nullable = false, length = 255)
    private String optionA;

    @Column(name = "option_b", nullable = false, length = 255)
    private String optionB;

    /** "A" hoac "B" - lua chon dung */
    @Column(name = "correct_option", nullable = false, columnDefinition = "CHAR(1)")
    private String correctOption;
}
