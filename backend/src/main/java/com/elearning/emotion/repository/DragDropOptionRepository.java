package com.elearning.emotion.repository;

import com.elearning.emotion.entity.DragDropOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DragDropOptionRepository extends JpaRepository<DragDropOption, String> {
    List<DragDropOption> findByQuestionId(String questionId);
    List<DragDropOption> findByQuestionIdOrderByDisplayOrder(String questionId);
}
