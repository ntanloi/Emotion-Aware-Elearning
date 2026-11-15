package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabSetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabSetItemRepository extends JpaRepository<VocabSetItem, String> {
    List<VocabSetItem> findByContentItemIdOrderByOrderIndex(String contentItemId);

    /** Truy vấn tối ưu gom sẵn VocabWord và Media bằng 1 câu JOIN FETCH duy nhất (tương tự findByContentItemIdWithMedia của Question) */
    @org.springframework.data.jpa.repository.Query("SELECT vsi FROM VocabSetItem vsi " +
           "JOIN FETCH vsi.word w " +
           "LEFT JOIN FETCH w.image " +
           "LEFT JOIN FETCH w.audioUk " +
           "LEFT JOIN FETCH w.audioUs " +
           "WHERE vsi.contentItem.id = :contentItemId " +
           "ORDER BY vsi.orderIndex ASC")
    List<VocabSetItem> findByContentItemIdWithMedia(@org.springframework.data.repository.query.Param("contentItemId") String contentItemId);

    /** Đếm số lượng từ theo từng ContentItem */
    @org.springframework.data.jpa.repository.Query("SELECT vsi.contentItem.id, COUNT(vsi.id) FROM VocabSetItem vsi WHERE vsi.contentItem.id IN :contentItemIds GROUP BY vsi.contentItem.id")
    List<Object[]> countWordsByContentItemIds(@org.springframework.data.repository.query.Param("contentItemIds") List<String> contentItemIds);

    /** Lấy danh sách từ cơ bản (orderIndex < 5) để làm preview sample words */
    @org.springframework.data.jpa.repository.Query("SELECT vsi.contentItem.id, w.word, w.meaningVi FROM VocabSetItem vsi " +
           "JOIN vsi.word w " +
           "WHERE vsi.contentItem.id IN :contentItemIds AND vsi.orderIndex < 5 " +
           "ORDER BY vsi.contentItem.id ASC, vsi.orderIndex ASC")
    List<Object[]> findSampleWordsByContentItemIds(@org.springframework.data.repository.query.Param("contentItemIds") List<String> contentItemIds);

    /** Dung de chan xoa 1 VocabWord dang duoc dung trong it nhat 1 Bo tu vung */
    boolean existsByWordId(String wordId);

    @org.springframework.data.jpa.repository.Query("SELECT vsi FROM VocabSetItem vsi " +
           "JOIN FETCH vsi.word w " +
           "LEFT JOIN FETCH w.image " +
           "LEFT JOIN FETCH w.audioUk " +
           "LEFT JOIN FETCH w.audioUs " +
           "JOIN FETCH vsi.contentItem ci " +
           "JOIN FETCH ci.course c " +
           "WHERE (:courseId IS NULL OR c.id = :courseId) " +
           "ORDER BY ci.id ASC, vsi.orderIndex ASC")
    List<VocabSetItem> findAllWithWordAndCourse(@org.springframework.data.repository.query.Param("courseId") String courseId);
}

