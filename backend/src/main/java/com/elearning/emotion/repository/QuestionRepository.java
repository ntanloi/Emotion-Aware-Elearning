package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, String> {
    List<Question> findByContentItemIdOrderByOrderIndex(String contentItemId);

    /** Dung de chan xoa 1 Passage dang duoc it nhat 1 cau hoi tham chieu toi */
    List<Question> findByPassageId(String passageId);

    /** Cac cau DICTATION da TU SINH truoc do cua 1 Bo chinh ta - xoa het truoc khi "Sinh lai" */
    List<Question> findByContentItemIdAndSourceVocabWordIsNotNull(String contentItemId);
}