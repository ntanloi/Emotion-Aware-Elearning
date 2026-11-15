package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabExample;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabExampleRepository extends JpaRepository<VocabExample, String> {
    List<VocabExample> findByWordId(String wordId);

    @org.springframework.data.jpa.repository.Query("SELECT ve FROM VocabExample ve LEFT JOIN FETCH ve.audio WHERE ve.word.id IN :wordIds")
    List<VocabExample> findByWordIdInWithAudio(@org.springframework.data.repository.query.Param("wordIds") List<String> wordIds);
}
