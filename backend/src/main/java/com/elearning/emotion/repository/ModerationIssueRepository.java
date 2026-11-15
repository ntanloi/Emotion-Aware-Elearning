package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ModerationIssue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationIssueRepository extends JpaRepository<ModerationIssue, String> {

    List<ModerationIssue> findByRunId(String runId);

    List<ModerationIssue> findByRunIdAndSeverity(String runId, String severity);

    long countByRunIdAndSeverity(String runId, String severity);
}
