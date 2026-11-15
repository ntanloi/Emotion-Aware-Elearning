package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {

    @Query(value = "SELECT a FROM AuditLog a LEFT JOIN FETCH a.actor ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM AuditLog a")
    Page<AuditLog> findAllWithActorByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
