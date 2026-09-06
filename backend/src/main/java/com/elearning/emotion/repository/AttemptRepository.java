package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttemptRepository extends JpaRepository<Attempt, String> {
    List<Attempt> findByUserIdOrderByStartedAtDesc(String userId);
    List<Attempt> findByContentItemId(String contentItemId);
}
