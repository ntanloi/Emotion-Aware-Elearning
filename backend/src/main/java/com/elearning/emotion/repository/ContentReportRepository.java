package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContentReportRepository extends JpaRepository<ContentReport, String> {
    Page<ContentReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<ContentReport> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByStatus(String status);
    List<ContentReport> findByTargetTypeAndTargetId(String targetType, String targetId);
}
