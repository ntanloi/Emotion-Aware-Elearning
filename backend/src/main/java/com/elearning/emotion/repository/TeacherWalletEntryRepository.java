package com.elearning.emotion.repository;

import com.elearning.emotion.entity.TeacherWalletEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TeacherWalletEntryRepository extends JpaRepository<TeacherWalletEntry, String>, JpaSpecificationExecutor<TeacherWalletEntry> {

    List<TeacherWalletEntry> findByTeacherIdOrderByCreatedAtDesc(String teacherId);
    Page<TeacherWalletEntry> findByTeacherIdOrderByCreatedAtDesc(String teacherId, Pageable pageable);

    /**
     * Tổng số tiền đã đến hạn (availableAt <= now).
     * Bao gồm: SALE (dương), REFUND (âm), PAYOUT (âm).
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM TeacherWalletEntry e WHERE e.teacher.id = :teacherId AND e.availableAt <= :now")
    BigDecimal sumAvailableLedgerByTeacherId(@Param("teacherId") String teacherId, @Param("now") LocalDateTime now);

    /**
     * Tổng thu nhập thực nhận của giảng viên (chưa trừ các lần rút).
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM TeacherWalletEntry e " +
           "WHERE e.teacher.id = :teacherId AND e.type IN ('SALE', 'REWARD_RELEASE', 'REFUND')")
    BigDecimal sumEarnedByTeacherId(@Param("teacherId") String teacherId);

    /**
     * Kiểm tra xem đơn hàng đã từng được ghi sổ SALE chưa
     */
    boolean existsByOrderIdAndType(String orderId, String type);
}
