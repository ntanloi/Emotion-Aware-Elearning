package com.elearning.emotion.repository;

import com.elearning.emotion.entity.DailyReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyReportRepository extends JpaRepository<DailyReport, String> {
    java.util.List<DailyReport> findByUserIdOrderByReportDateDesc(String userId);
    java.util.Optional<DailyReport> findByUserIdAndReportDate(String userId, java.time.LocalDate reportDate);

    long countByUserId(String userId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM DailyReport d WHERE d.user.id = :userId")
    int deleteByUserId(@org.springframework.data.repository.query.Param("userId") String userId);
}
