package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "answer_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnswerOption {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    /** A/B/C/D - de hien thi dung thu tu nhu de thi that */
    @Column(length = 5)
    private String label;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private Boolean isCorrect = false;

    @Transient
    private Integer orderIndex;

    public boolean isCorrect() {
        return Boolean.TRUE.equals(isCorrect);
    }

    public void setCorrect(boolean correct) {
        this.isCorrect = correct;
    }

    public Integer getOrderIndex() {
        return this.orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public static class AnswerOptionBuilder {
        public AnswerOptionBuilder correct(boolean correct) {
            return isCorrect(Boolean.valueOf(correct));
        }

        public AnswerOptionBuilder orderIndex(int orderIndex) {
            this.orderIndex = orderIndex;
            return this;
        }

        public AnswerOptionBuilder orderIndex(Integer orderIndex) {
            this.orderIndex = orderIndex;
            return this;
        }
    }
}
