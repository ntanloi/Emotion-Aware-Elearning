package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ToeicTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ToeicTestRepository extends JpaRepository<ToeicTest, String>, JpaSpecificationExecutor<ToeicTest> {

    List<ToeicTest> findByStatus(String status);

    List<ToeicTest> findByAuthorId(String authorId);
    List<ToeicTest> findByAuthorIdOrderByCreatedAtDesc(String authorId);
    Page<ToeicTest> findByAuthorIdOrderByCreatedAtDesc(String authorId, Pageable pageable);

    List<ToeicTest> findByCourseId(String courseId);

    Page<ToeicTest> findByStatusOrderByPublishedAtDesc(String status, Pageable pageable);

    Optional<ToeicTest> findByIdAndStatus(String id, String status);

    long countByAuthorId(String authorId);

    long countByStatus(String status);

    long countBySource(String source);

    boolean existsByAuthorIdAndTitleIgnoreCaseAndStatusIn(String authorId, String title, Collection<String> statuses);

    boolean existsByAuthorIdAndTitleIgnoreCaseAndStatusInAndIdNot(String authorId, String title, Collection<String> statuses, String id);
}
