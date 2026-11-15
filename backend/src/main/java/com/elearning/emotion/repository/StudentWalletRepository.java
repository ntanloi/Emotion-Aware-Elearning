package com.elearning.emotion.repository;

import com.elearning.emotion.entity.StudentWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StudentWalletRepository extends JpaRepository<StudentWallet, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from StudentWallet w where w.userId = :userId")
    Optional<StudentWallet> lockByUserId(@Param("userId") String userId);

    Optional<StudentWallet> findByTopupCode(String topupCode);
}
