package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ReviewReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, String> {

    List<ReviewReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<ReviewReport> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);

    List<ReviewReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(String status);

    List<ReviewReport> findByReviewId(String reviewId);

    List<ReviewReport> findByReviewIdAndStatus(String reviewId, String status);

    boolean existsByReviewIdAndReporterId(String reviewId, String reporterId);
}
