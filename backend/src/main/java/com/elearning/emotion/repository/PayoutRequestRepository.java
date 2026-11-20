package com.elearning.emotion.repository;

import com.elearning.emotion.entity.PayoutRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, String>, JpaSpecificationExecutor<PayoutRequest> {
    List<PayoutRequest> findByTeacherIdOrderByCreatedAtDesc(String teacherId);
    List<PayoutRequest> findByStatus(String status);
    boolean existsByTeacherIdAndStatus(String teacherId, String status);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequest p WHERE p.teacher.id = :teacherId AND p.status = 'PENDING'")
    BigDecimal sumPendingPayoutByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequest p WHERE p.teacher.id = :teacherId AND p.status = 'APPROVED'")
    BigDecimal sumApprovedPayoutByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequest p WHERE p.status = 'PENDING'")
    BigDecimal sumTotalPendingPayout();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequest p WHERE p.status = 'APPROVED'")
    BigDecimal sumTotalApprovedPayout();

    Page<PayoutRequest> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    long countByStatus(String status);
}
