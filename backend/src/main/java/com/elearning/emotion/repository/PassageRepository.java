package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Passage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PassageRepository extends JpaRepository<Passage, String> {
    List<Passage> findByContentItemIdOrderByOrderIndex(String contentItemId);
}
