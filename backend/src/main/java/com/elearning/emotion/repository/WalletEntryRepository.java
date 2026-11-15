package com.elearning.emotion.repository;

import com.elearning.emotion.entity.WalletEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface WalletEntryRepository extends JpaRepository<WalletEntry, String> {

    boolean existsByPaymentTransactionIdAndType(String paymentTransactionId, String type);

    @Query("select coalesce(sum(e.amount), 0) from WalletEntry e where e.userId = :u and e.bucket = 'CASH' "
            + "and e.amount > 0 and e.type in ('TOPUP', 'ADJUST') and e.createdAt >= :since")
    BigDecimal sumRecentCashInflow(@Param("u") String userId, @Param("since") LocalDateTime since);

    @Query("select min(e.createdAt) from WalletEntry e where e.userId = :u and e.bucket = 'CASH' "
            + "and e.amount > 0 and e.type in ('TOPUP', 'ADJUST') and e.createdAt >= :since")
    LocalDateTime firstRecentCashInflowAt(@Param("u") String userId, @Param("since") LocalDateTime since);

    Page<WalletEntry> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<WalletEntry> findByUserIdOrderByCreatedAtDesc(String userId);
}
