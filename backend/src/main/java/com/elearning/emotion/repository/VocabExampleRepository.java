package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabExample;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabExampleRepository extends JpaRepository<VocabExample, String> {
    List<VocabExample> findByWordId(String wordId);
}
