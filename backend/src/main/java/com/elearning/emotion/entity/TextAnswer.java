package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

/** Dap an dang chu (dien tu ngu phap / chinh ta) - cham bang so khop chuoi */
@Entity
@Table(name = "text_answers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TextAnswer {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    @Column(name = "correct_text", nullable = false, length = 500)
    private String correctText;

    @Column(length = 255)
    private String hint;
}
