package com.elearning.emotion.repository;

import com.elearning.emotion.entity.CoursePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CoursePolicyRepository extends JpaRepository<CoursePolicy, String> {

    Optional<CoursePolicy> findByVersion(Integer version);

    Optional<CoursePolicy> findFirstByActiveTrueOrderByVersionDesc();

    @Query("SELECT MAX(cp.version) FROM CoursePolicy cp")
    Integer findMaxVersion();
}
