package com.elearning.emotion.service;

import com.elearning.emotion.dto.moderation.AdminModerationReportDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionRequest;
import com.elearning.emotion.dto.moderation.ModerationIssueDetailDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminModerationService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ModerationRunRepository moderationRunRepository;
    private final ModerationIssueRepository moderationIssueRepository;
    private final ModerationIssueDecisionRepository moderationIssueDecisionRepository;
    private final PolicyService policyService;
    private final ModerationAnalysisService moderationAnalysisService;
    private final ModerationContextBuilder moderationContextBuilder;

    @Transactional(readOnly = true)
    public AdminModerationReportDto getCourseModerationReport(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        ModerationRun run = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId)
                .orElse(null);

        JsonNode policy = policyService.getActivePolicy();
        List<String> checklistItems = new ArrayList<>();
        if (policy != null && policy.has("approval") && policy.path("approval").has("checklistItems")) {
            for (JsonNode item : policy.path("approval").path("checklistItems")) {
                checklistItems.add(item.asText());
            }
        } else {
            checklistItems.addAll(List.of(
                    "Đã xem nội dung bài giảng chính của khóa học",
                    "Đã đối chiếu các lỗi AI/luật đánh dấu",
                    "Nội dung không vi phạm bản quyền và quy định nền tảng",
                    "Thông tin khóa học (tên, mô tả, giá) trung thực"
            ));
        }

        if (run == null) {
            return AdminModerationReportDto.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .status("NO_RUN")
                    .riskLevel("LOW")
                    .riskScore(0)
                    .canApprove(false)
                    .approvalBlockReasons(Collections.singletonList("Khóa học chưa có dữ liệu kiểm duyệt. Vui lòng bấm 'Phân tích lại' để tiến hành kiểm tra."))
                    .checklistItems(checklistItems)
                    .issues(Collections.emptyList())
                    .build();
        }

        if ("ANALYZING".equals(run.getStatus())) {
            // Không thực hiện ghi DB trong hàm GET report (tránh side effect).
            // Nếu quá 15 phút thì trả về cảnh báo đã quá hạn trong DTO để Admin có thể nhấn Phân tích lại.
            boolean isOverdue = run.getSubmittedAt() != null
                    && run.getSubmittedAt().isBefore(LocalDateTime.now().minusMinutes(15));

            String message = isOverdue
                    ? "Tiến trình phân tích kiểm duyệt đã quá thời gian tối đa (15 phút). Vui lòng nhấn 'Phân tích lại'."
                    : "Hệ thống đang tiến hành phân tích nội dung khóa học. Vui lòng tải lại trang sau giây lát.";

            return AdminModerationReportDto.builder()
                    .runId(run.getId())
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .status(isOverdue ? "FAILED" : "ANALYZING")
                    .riskLevel("LOW")
                    .riskScore(0)
                    .canApprove(false)
                    .approvalBlockReasons(Collections.singletonList(message))
                    .checklistItems(checklistItems)
                    .issues(Collections.emptyList())
                    .build();
        }

        List<ModerationIssue> entityIssues = moderationIssueRepository.findByRunId(run.getId());
        List<ModerationIssueDecision> decisions = moderationIssueDecisionRepository.findByCourseId(courseId);

        Map<String, ModerationIssueDecision> decisionMap = new HashMap<>();
        for (ModerationIssueDecision d : decisions) {
            decisionMap.put(d.getIssueKey(), d);
        }

        int blockers = 0;
        int errors = 0;
        int warnings = 0;
        int infos = 0;
        int undecidedErrors = 0;
        int needFixCount = 0;

        List<ModerationIssueDetailDto> issueDtos = new ArrayList<>();
        for (ModerationIssue mi : entityIssues) {
            ModerationIssueDecision dec = decisionMap.get(mi.getIssueKey());
            ModerationDecisionDto decDto = ModerationDecisionDto.from(dec);

            String sev = mi.getSeverity() != null ? mi.getSeverity().toUpperCase() : "INFO";
            if ("BLOCKER".equals(sev)) blockers++;
            else if ("ERROR".equals(sev)) {
                errors++;
                if (dec == null) undecidedErrors++;
            } else if ("WARNING".equals(sev)) warnings++;
            else infos++;

            if (dec != null && "NEED_FIX".equalsIgnoreCase(dec.getDecision())) {
                needFixCount++;
            }

            String jumpTo = "/admin/courses/" + courseId + "/review";
            if ("ITEM".equalsIgnoreCase(mi.getTargetType()) && mi.getTargetId() != null) {
                jumpTo = "/admin/courses/" + courseId + "/review?itemId=" + mi.getTargetId();
            }

            issueDtos.add(ModerationIssueDetailDto.from(mi, decDto, jumpTo));
        }

        List<String> blockReasons = new ArrayList<>();
        if (!"READY_FOR_REVIEW".equalsIgnoreCase(run.getStatus())) {
            blockReasons.add("Tiến trình kiểm tra chưa hoàn tất (Trạng thái: " + run.getStatus() + ")");
        }
        if (undecidedErrors > 0) {
            blockReasons.add(String.format("Còn %d lỗi ERROR bắt buộc kiểm duyệt viên phải quyết định (Chấp nhận / Bỏ qua / Yêu cầu sửa).", undecidedErrors));
        }
        if (needFixCount > 0) {
            blockReasons.add(String.format("Còn %d vấn đề đang yêu cầu giảng viên sửa đổi (NEED_FIX). Không thể phê duyệt khi còn yêu cầu sửa.", needFixCount));
        }

        boolean canApprove = blockReasons.isEmpty();

        return AdminModerationReportDto.builder()
                .runId(run.getId())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .status(run.getStatus())
                .riskScore(run.getRiskScore() != null ? run.getRiskScore() : 0)
                .riskLevel(run.getRiskLevel() != null ? run.getRiskLevel() : "LOW")
                .submittedAt(run.getSubmittedAt())
                .finishedAt(run.getFinishedAt())
                .totalIssues(entityIssues.size())
                .blockerCount(blockers)
                .errorCount(errors)
                .warningCount(warnings)
                .infoCount(infos)
                .undecidedErrorCount(undecidedErrors)
                .needFixCount(needFixCount)
                .canApprove(canApprove)
                .approvalBlockReasons(blockReasons)
                .checklistItems(checklistItems)
                .readinessSnapshot(run.getReadinessSnapshot())
                .issues(issueDtos)
                .build();
    }

    @Transactional
    public ModerationDecisionDto updateIssueDecision(String adminId, String issueId, ModerationDecisionRequest req) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ModerationIssue issue = moderationIssueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy issue kiểm duyệt"));

        ModerationRun run = issue.getRun();
        Course course = run.getCourse();

        String decisionVal = req.getDecision() != null ? req.getDecision().toUpperCase().trim() : "ACCEPT";
        if (!Arrays.asList("ACCEPT", "DISMISS", "NEED_FIX").contains(decisionVal)) {
            throw new IllegalArgumentException("Quyết định không hợp lệ. Chỉ chấp nhận ACCEPT, DISMISS hoặc NEED_FIX");
        }

        ModerationIssueDecision decision = moderationIssueDecisionRepository
                .findByCourseIdAndIssueKey(course.getId(), issue.getIssueKey())
                .orElse(null);

        if (decision == null) {
            decision = ModerationIssueDecision.builder()
                    .course(course)
                    .issueKey(issue.getIssueKey())
                    .contentHash(run.getContentHash())
                    .decision(decisionVal)
                    .note(req.getNote())
                    .decidedBy(admin)
                    .decidedAt(LocalDateTime.now())
                    .build();
        } else {
            decision.setDecision(decisionVal);
            decision.setNote(req.getNote());
            decision.setDecidedBy(admin);
            decision.setDecidedAt(LocalDateTime.now());
            decision.setContentHash(run.getContentHash());
        }

        ModerationIssueDecision saved = moderationIssueDecisionRepository.save(decision);
        log.info("Admin {} đã đưa ra quyết định {} cho issue {} (Khóa học {})",
                admin.getFullName(), decisionVal, issue.getRuleId(), course.getId());

        return ModerationDecisionDto.from(saved);
    }

    /**
     * Thống kê độ chính xác thực tế của từng rule dựa trên tỷ lệ ACCEPT vs DISMISS
     */
    @Transactional(readOnly = true)
    public List<com.elearning.emotion.dto.moderation.RuleAccuracyStatsDto> getRuleAccuracyStats() {
        List<Object[]> rows = moderationIssueDecisionRepository.countDecisionsGroupedByRuleAndDecision();
        Map<String, long[]> statsMap = new LinkedHashMap<>();

        for (Object[] r : rows) {
            String ruleId = (String) r[0];
            String dec = (String) r[1];
            long count = ((Number) r[2]).longValue();

            long[] arr = statsMap.computeIfAbsent(ruleId, k -> new long[3]); // [0: ACCEPT, 1: DISMISS, 2: NEED_FIX]
            if ("ACCEPT".equalsIgnoreCase(dec)) {
                arr[0] += count;
            } else if ("DISMISS".equalsIgnoreCase(dec)) {
                arr[1] += count;
            } else if ("NEED_FIX".equalsIgnoreCase(dec)) {
                arr[2] += count;
            }
        }

        List<com.elearning.emotion.dto.moderation.RuleAccuracyStatsDto> result = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : statsMap.entrySet()) {
            String ruleId = entry.getKey();
            long[] counts = entry.getValue();
            long accept = counts[0];
            long dismiss = counts[1];
            long needFix = counts[2];
            long total = accept + dismiss + needFix;
            double precision = total > 0 ? (double) (accept + needFix) / total * 100.0 : 0.0;

            result.add(com.elearning.emotion.dto.moderation.RuleAccuracyStatsDto.builder()
                    .ruleId(ruleId)
                    .totalDecisions(total)
                    .acceptCount(accept)
                    .dismissCount(dismiss)
                    .needFixCount(needFix)
                    .precisionRate(Math.round(precision * 10.0) / 10.0)
                    .build());
        }

        return result;
    }

    /**
     * H-b: Yêu cầu thẩm định lại khóa học (Re-analyze) bất đồng bộ.
     * Có cơ chế chống chạy trùng: nếu khóa đang có lượt ANALYZING trong vòng 15 phút qua thì không tạo mới.
     */
    @Transactional
    public AdminModerationReportDto reanalyzeCourse(String courseId) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        // Chặn chạy trùng nếu đang có tiến trình ANALYZING còn hiệu lực
        Optional<ModerationRun> latestOpt = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId);
        if (latestOpt.isPresent()) {
            ModerationRun latest = latestOpt.get();
            if ("ANALYZING".equals(latest.getStatus())
                    && latest.getSubmittedAt() != null
                    && latest.getSubmittedAt().isAfter(LocalDateTime.now().minusMinutes(15))) {
                throw new IllegalStateException("Hệ thống đang tiến hành phân tích nội dung khóa học. Vui lòng đợi trong giây lát hoặc làm mới trang.");
            }
        }

        ModerationContext modCtx = moderationContextBuilder.buildContext(course);
        ModerationRun newRun = ModerationRun.builder()
                .course(course)
                .submittedAt(LocalDateTime.now())
                .policyVersion(policyService.getActivePolicyVersion())
                .contentHash(modCtx.getContentHash())
                .status("ANALYZING")
                .riskScore(0)
                .riskLevel("LOW")
                .build();
        newRun = moderationRunRepository.save(newRun);
        moderationAnalysisService.runAnalysisAfterCommit(course.getId(), newRun.getId());
        return getCourseModerationReport(courseId);
    }
}
