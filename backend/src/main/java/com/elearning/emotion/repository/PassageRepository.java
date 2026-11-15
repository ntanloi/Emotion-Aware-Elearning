package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Passage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface PassageRepository extends JpaRepository<Passage, String> {
    List<Passage> findByContentItemIdOrderByOrderIndex(String contentItemId);

    List<Passage> findByContentItemIdInOrderByOrderIndex(Collection<String> contentItemIds);

    /** Truy vấn tối ưu gom sẵn cả audio và image bằng 1 câu JOIN FETCH duy nhất */
    @Query("SELECT p FROM Passage p LEFT JOIN FETCH p.audio LEFT JOIN FETCH p.image WHERE p.contentItem.id = :contentItemId ORDER BY p.orderIndex")
    List<Passage> findByContentItemIdWithMedia(@Param("contentItemId") String contentItemId);

    @Query("SELECT DISTINCT p FROM Passage p LEFT JOIN FETCH p.audio LEFT JOIN FETCH p.image WHERE p.contentItem.id IN :contentItemIds ORDER BY p.orderIndex")
    List<Passage> findByContentItemIdInWithMedia(@Param("contentItemIds") Collection<String> contentItemIds);
}
