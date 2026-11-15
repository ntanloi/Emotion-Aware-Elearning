package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "vocab_examples")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VocabExample {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private VocabWord word;

    @Column(name = "sentence_en", nullable = false, columnDefinition = "TEXT")
    private String sentenceEn;

    @Column(name = "sentence_vi", nullable = false, columnDefinition = "TEXT")
    private String sentenceVi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_media_id")
    private MediaAsset audio;
    public VocabWord getVocabWord() {
        return this.word;
    }

    public void setVocabWord(VocabWord vocabWord) {
        this.word = vocabWord;
    }

    public String getSentence() {
        return this.sentenceEn;
    }

    public void setSentence(String sentence) {
        this.sentenceEn = sentence;
    }

    public String getMeaning() {
        return this.sentenceVi;
    }

    public void setMeaning(String meaning) {
        this.sentenceVi = meaning;
    }

    public static class VocabExampleBuilder {
        public VocabExampleBuilder vocabWord(VocabWord vocabWord) {
            return word(vocabWord);
        }

        public VocabExampleBuilder sentence(String sentence) {
            return sentenceEn(sentence);
        }

        public VocabExampleBuilder meaning(String meaning) {
            return sentenceVi(meaning);
        }
    }
}
