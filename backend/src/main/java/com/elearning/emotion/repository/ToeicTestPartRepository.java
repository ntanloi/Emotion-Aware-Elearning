package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ToeicTestPart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ToeicTestPartRepository extends JpaRepository<ToeicTestPart, String> {

    List<ToeicTestPart> findByTestIdOrderByPartNoAsc(String testId);

    Optional<ToeicTestPart> findByTestIdAndPartNo(String testId, Integer partNo);

    void deleteByTestId(String testId);

    Optional<ToeicTestPart> findFirstByContentItemId(String contentItemId);
}
