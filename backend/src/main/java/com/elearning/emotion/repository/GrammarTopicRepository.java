package com.elearning.emotion.repository;

import com.elearning.emotion.entity.GrammarTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GrammarTopicRepository extends JpaRepository<GrammarTopic, String> {

    List<GrammarTopic> findAllByOrderBySortOrderAsc();
}
