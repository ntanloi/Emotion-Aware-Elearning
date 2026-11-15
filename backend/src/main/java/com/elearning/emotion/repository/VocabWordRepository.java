package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface VocabWordRepository extends JpaRepository<VocabWord, String> {
    List<VocabWord> findByTeacherId(String teacherId);

    Page<VocabWord> findByTeacherId(String teacherId, Pageable pageable);

    /** Lay an toan theo dung giao vien so huu - tranh giao vien A dung tu cua giao vien B */
    List<VocabWord> findByIdInAndTeacherId(List<String> ids, String teacherId);

    @Query("SELECT v FROM VocabWord v WHERE v.teacher.id = :teacherId " +
           "AND (:search IS NULL OR LOWER(v.word) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.meaningVi) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.ipa) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:partOfSpeech IS NULL OR UPPER(v.partOfSpeech) = UPPER(:partOfSpeech))")
    Page<VocabWord> searchTeacherVocab(
            @Param("teacherId") String teacherId,
            @Param("search") String search,
            @Param("partOfSpeech") String partOfSpeech,
            Pageable pageable
    );
}
