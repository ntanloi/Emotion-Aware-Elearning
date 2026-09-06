package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabWord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabWordRepository extends JpaRepository<VocabWord, String> {
    List<VocabWord> findByTeacherId(String teacherId);

    /** Lay an toan theo dung giao vien so huu - tranh giao vien A dung tu cua giao vien B */
    List<VocabWord> findByIdInAndTeacherId(List<String> ids, String teacherId);
}
