package com.elearning.emotion.repository;

import com.elearning.emotion.entity.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String>, JpaSpecificationExecutor<PaymentTransaction> {
    boolean existsBySepayId(Long sepayId);
    Optional<PaymentTransaction> findBySepayId(Long sepayId);
    Page<PaymentTransaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(t.transferAmount), 0) FROM PaymentTransaction t WHERE t.status = 'MATCHED'")
    BigDecimal sumTotalMatchedInflow();
}
