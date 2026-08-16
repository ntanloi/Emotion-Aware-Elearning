package com.elearning.emotion.repository;

import com.elearning.emotion.entity.DailyReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyReportRepository extends JpaRepository<DailyReport, String> {
}
