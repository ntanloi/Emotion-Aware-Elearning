package com.elearning.emotion.repository;

import com.elearning.emotion.entity.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String>, JpaSpecificationExecutor<PaymentTransaction> {
    boolean existsBySepayId(Long sepayId);
    Optional<PaymentTransaction> findBySepayId(Long sepayId);
    Page<PaymentTransaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<PaymentTransaction> findByTransferTypeOrderByCreatedAtDesc(String transferType, Pageable pageable);
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(t.transferAmount), 0) FROM PaymentTransaction t WHERE t.status = 'MATCHED' AND (t.transferType = 'in' OR t.transferType IS NULL)")
    BigDecimal sumTotalMatchedInflow();

    Optional<PaymentTransaction> findByPayoutRequestId(String payoutRequestId);

    @Query("SELECT t FROM PaymentTransaction t WHERE LOWER(t.transferType) = 'out' AND " +
           "(LOWER(t.referenceCode) = LOWER(:ref) OR LOWER(t.code) = LOWER(:ref) OR " +
           "CAST(t.sepayId AS string) = :ref OR LOWER(t.content) LIKE LOWER(CONCAT('%', :ref, '%')))")
    List<PaymentTransaction> findOutgoingByReference(@Param("ref") String ref);

    @Query("SELECT t FROM PaymentTransaction t WHERE LOWER(t.transferType) = 'out' AND t.transferAmount = :amount AND t.status <> 'MATCHED'")
    List<PaymentTransaction> findUnmatchedOutgoingByAmount(@Param("amount") BigDecimal amount);

    @Query("SELECT t FROM PaymentTransaction t WHERE LOWER(t.transferType) = 'out' ORDER BY t.createdAt DESC")
    List<PaymentTransaction> findRecentOutgoing(Pageable pageable);
}
