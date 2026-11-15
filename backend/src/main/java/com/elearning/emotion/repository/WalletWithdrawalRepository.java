package com.elearning.emotion.repository;

import com.elearning.emotion.entity.WalletWithdrawal;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WalletWithdrawalRepository extends JpaRepository<WalletWithdrawal, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WalletWithdrawal w where w.id = :id")
    Optional<WalletWithdrawal> lockById(@Param("id") String id);

    boolean existsByUserIdAndStatus(String userId, String status);

    List<WalletWithdrawal> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<WalletWithdrawal> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<WalletWithdrawal> findByStatusOrderByCreatedAtAsc(String status);

    Page<WalletWithdrawal> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);
}
