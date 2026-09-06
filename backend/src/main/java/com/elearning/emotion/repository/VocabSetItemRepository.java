package com.elearning.emotion.repository;

import com.elearning.emotion.entity.VocabSetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabSetItemRepository extends JpaRepository<VocabSetItem, String> {
    List<VocabSetItem> findByContentItemIdOrderByOrderIndex(String contentItemId);

    /** Dung de chan xoa 1 VocabWord dang duoc dung trong it nhat 1 Bo tu vung */
    boolean existsByWordId(String wordId);
}
