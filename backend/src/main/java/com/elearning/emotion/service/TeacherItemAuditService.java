package com.elearning.emotion.service;

import com.elearning.emotion.dto.moderation.ItemAuditResultDto;
import com.elearning.emotion.dto.moderation.ModerationIssueDetailDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Passage;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.engine.RuleRegistry;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.repository.ContentItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherItemAuditService {

    private final ContentItemRepository contentItemRepository;
    private final ModerationContextBuilder contextBuilder;
    private final RuleRegistry ruleRegistry;
    private final CourseAccessService courseAccessService;

    @Transactional(readOnly = true)
    public ItemAuditResultDto auditItem(String teacherId, String itemId, String ruleId) {
        ContentItem item = contentItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hoạt động bài học"));
        Course course = item.getCourse();
        courseAccessService.validateCanView(teacherId, course);

        ModerationContext ctx = contextBuilder.buildContext(course);

        Collection<ModerationRule> rulesToRun;
        if (ruleId != null && !ruleId.isBlank()) {
            ModerationRule r = ruleRegistry.getRule(ruleId.trim().toUpperCase());
            if (r != null) {
                rulesToRun = Collections.singletonList(r);
            } else {
                rulesToRun = ruleRegistry.getAllRules();
            }
        } else {
            rulesToRun = ruleRegistry.getAllRules();
        }

        List<RuleIssue> matchedIssues = new ArrayList<>();
        Set<String> itemQuestionIds = ctx.getItemQuestions(itemId).stream()
                .map(Question::getId).collect(Collectors.toSet());
        Set<String> itemPassageIds = ctx.getItemPassages(itemId).stream()
                .map(Passage::getId).collect(Collectors.toSet());
        String videoMediaId = item.getVideoMedia() != null ? item.getVideoMedia().getId() : null;

        for (ModerationRule r : rulesToRun) {
            try {
                List<RuleIssue> evalIssues = r.evaluate(ctx);
                if (evalIssues == null) continue;
                for (RuleIssue ri : evalIssues) {
                    boolean isThisItem = false;
                    if (itemId.equals(ri.getTargetId())) {
                        isThisItem = true;
                    } else if (videoMediaId != null && videoMediaId.equals(ri.getTargetId())) {
                        isThisItem = true;
                    } else if (itemQuestionIds.contains(ri.getTargetId())) {
                        isThisItem = true;
                    } else if (itemPassageIds.contains(ri.getTargetId())) {
                        isThisItem = true;
                    } else if (ri.getMessage() != null && ri.getMessage().contains("'" + item.getTitle() + "'")) {
                        isThisItem = true;
                    }

                    if (isThisItem) {
                        matchedIssues.add(ri);
                    }
                }
            } catch (Exception ex) {
                log.error("Lỗi khi kiểm tra luật {} trên hoạt động {}: {}", r.id(), itemId, ex.getMessage());
            }
        }

        boolean fixed = matchedIssues.isEmpty();
        String message;
        if (fixed) {
            if (ruleId != null && !ruleId.isBlank()) {
                message = String.format("Tuyệt vời! Lỗi [%s] đã được khắc phục hoàn toàn.", ruleId.trim().toUpperCase());
            } else {
                message = "Hoạt động đã đáp ứng đầy đủ tiêu chuẩn kiểm duyệt chất lượng.";
            }
        } else {
            message = matchedIssues.get(0).getMessage();
        }

        List<ModerationIssueDetailDto> issueDtos = matchedIssues.stream()
                .map(ri -> ModerationIssueDetailDto.builder()
                        .ruleId(ri.getRuleId())
                        .category(ri.getCategory())
                        .severity(ri.getSeverity() != null ? ri.getSeverity().name() : "WARNING")
                        .targetType(ri.getTargetType())
                        .targetId(ri.getTargetId())
                        .message(ri.getMessage())
                        .suggestion(ri.getSuggestion())
                        .build())
                .toList();

        return ItemAuditResultDto.builder()
                .itemId(itemId)
                .ruleId(ruleId != null ? ruleId.trim().toUpperCase() : null)
                .fixed(fixed)
                .message(message)
                .suggestion(!matchedIssues.isEmpty() ? matchedIssues.get(0).getSuggestion() : null)
                .remainingIssues(issueDtos)
                .build();
    }
}
