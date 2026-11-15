package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ModerationIssueDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModerationIssueDecisionRepository extends JpaRepository<ModerationIssueDecision, String> {

    Optional<ModerationIssueDecision> findByCourseIdAndIssueKey(String courseId, String issueKey);

    List<ModerationIssueDecision> findByCourseId(String courseId);

    List<ModerationIssueDecision> findByCourseIdAndDecision(String courseId, String decision);

    @org.springframework.data.jpa.repository.Query(
        "SELECT i.ruleId, d.decision, COUNT(DISTINCT d.id) " +
        "FROM ModerationIssueDecision d, ModerationIssue i " +
        "WHERE d.issueKey = i.issueKey " +
        "GROUP BY i.ruleId, d.decision"
    )
    List<Object[]> countDecisionsGroupedByRuleAndDecision();
}
