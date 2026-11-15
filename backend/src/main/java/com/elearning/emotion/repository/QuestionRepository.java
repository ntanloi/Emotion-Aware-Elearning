package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, String> {
    List<Question> findByContentItemIdOrderByOrderIndex(String contentItemId);

    List<Question> findByContentItemIdInOrderByOrderIndex(Collection<String> contentItemIds);

    /** Truy vấn tối ưu gom sẵn cả audio và image bằng 1 câu JOIN FETCH duy nhất */
    @Query("SELECT q FROM Question q LEFT JOIN FETCH q.image LEFT JOIN FETCH q.audio WHERE q.contentItem.id = :contentItemId ORDER BY q.orderIndex")
    List<Question> findByContentItemIdWithMedia(@Param("contentItemId") String contentItemId);

    @Query("SELECT q FROM Question q LEFT JOIN FETCH q.image LEFT JOIN FETCH q.audio WHERE q.contentItem.id IN :contentItemIds ORDER BY q.orderIndex")
    List<Question> findByContentItemIdInWithMedia(@Param("contentItemIds") Collection<String> contentItemIds);

    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.passage p LEFT JOIN FETCH p.audio LEFT JOIN FETCH p.image LEFT JOIN FETCH q.image LEFT JOIN FETCH q.audio WHERE q.contentItem.id IN :contentItemIds ORDER BY q.orderIndex")
    List<Question> findByContentItemIdInWithDetails(@Param("contentItemIds") Collection<String> contentItemIds);

    /** Dung de chan xoa 1 Passage dang duoc it nhat 1 cau hoi tham chieu toi */
    List<Question> findByPassageId(String passageId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Question q SET q.status = :status WHERE q.passage.id = :passageId")
    int updateStatusByPassageId(@Param("passageId") String passageId, @Param("status") String status);

    /** Cac cau DICTATION da TU SINH truoc do cua 1 Bo chinh ta - xoa het truoc khi "Sinh lai" */
    List<Question> findByContentItemIdAndSourceVocabWordIsNotNull(String contentItemId);

    @Query("SELECT q.contentItem.id, COUNT(q.id) FROM Question q WHERE q.contentItem.id IN :itemIds AND (q.status IS NULL OR UPPER(q.status) = 'ACTIVE') GROUP BY q.contentItem.id")
    List<Object[]> countActiveQuestionsByItemIds(@Param("itemIds") Collection<String> itemIds);

    @Query("SELECT q FROM Question q JOIN FETCH q.contentItem ci JOIN FETCH ci.course c WHERE c.id != :courseId AND q.promptText = :promptText")
    List<Question> findByPromptTextInOtherCourses(@Param("courseId") String courseId, @Param("promptText") String promptText);

}
