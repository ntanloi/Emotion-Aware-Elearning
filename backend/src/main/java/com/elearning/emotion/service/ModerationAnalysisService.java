package com.elearning.emotion.service;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.engine.ModerationRunner;
import com.elearning.emotion.moderation.engine.RuleRegistry;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationAnalysisService {

    private final ModerationContextBuilder contextBuilder;
    private final ModerationRunner moderationRunner;
    private final RuleRegistry ruleRegistry;
    private final ModerationRunRepository moderationRunRepository;
    private final ModerationIssueRepository moderationIssueRepository;
    private final CourseRepository courseRepository;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<ModerationAsyncExecutor> asyncExecutorProvider;
    private final TransactionTemplate transactionTemplate;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    /**
     * Kích hoạt phân tích kiểm duyệt bất đồng bộ SAU KHI GIAO DỊCH HIỆN TẠI COMMIT (afterCommit).
     * Kiểm tra an toàn: nếu không có transaction synchronization đang active thì kích hoạt ngay lập tức.
     * Nếu đẩy tác vụ lên thread pool thất bại (TaskRejectedException do hàng đợi đầy), đánh dấu run FAILED ngay.
     */
    public void runAnalysisAfterCommit(String courseId, String runId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.info("Transaction đã commit. Kích hoạt phân tích kiểm duyệt async: courseId={}, runId={}", courseId, runId);
                    try {
                        ModerationAsyncExecutor executor = asyncExecutorProvider.getObject();
                        executor.executeAnalysisAsync(courseId, runId);
                    } catch (Exception e) {
                        log.error("Không thể submit tác vụ phân tích kiểm duyệt vào thread pool (hàng đợi đầy hoặc lỗi executor): {}", e.getMessage(), e);
                        markRunFailed(runId);
                    }
                }
            });
        } else {
            try {
                ModerationAsyncExecutor executor = asyncExecutorProvider.getObject();
                executor.executeAnalysisAsync(courseId, runId);
            } catch (Exception e) {
                log.error("Không thể submit tác vụ phân tích kiểm duyệt vào thread pool (hàng đợi đầy hoặc lỗi executor): {}", e.getMessage(), e);
                markRunFailed(runId);
            }
        }
    }

    /**
     * Tương thích ngược với các lời gọi trực tiếp cũ
     */
    public ModerationRun runAnalysis(Course course, ModerationRun run) {
        runAnalysis(course.getId(), run.getId());
        return moderationRunRepository.findById(run.getId()).orElse(run);
    }

    /**
     * Quy trình phân tích toàn diện 3 giai đoạn nhằm tối ưu hiệu năng và không nghẽn connection pool:
     * - Phase 1: Chuẩn bị context và đánh dấu ANALYZING trong transaction ngắn.
     * - Phase 2: Thực thi bộ luật (gọi external LLM / AI / LanguageTool) HOÀN TOÀN NGOÀI TRANSACTION (không giữ kết nối DB).
     * - Phase 3: Lưu issues và cập nhật trạng thái READY_FOR_REVIEW trong transaction ngắn (kiểm tra trạng thái trước khi ghi).
     */
    public void runAnalysis(String courseId, String runId) {
        log.info("Bắt đầu phân tích kiểm duyệt khóa học {} (Run ID: {})", courseId, runId);
        ModerationContext ctx = transactionTemplate != null
                ? transactionTemplate.execute(status -> prepareAndStartAnalysis(courseId, runId))
                : prepareAndStartAnalysis(courseId, runId);
        if (ctx == null) {
            return;
        }

        try {
            // Phase 2: Chạy các luật bên ngoài transaction, không chiếm giữ kết nối DB
            ModerationRunner.RunResult result = moderationRunner.runRules(ruleRegistry.getAllRules(), ctx);

            // Phase 3: Lưu kết quả trong transaction ngắn
            if (transactionTemplate != null) {
                transactionTemplate.executeWithoutResult(status -> saveAnalysisResult(courseId, runId, ctx, result));
            } else {
                saveAnalysisResult(courseId, runId, ctx, result);
            }
        } catch (Exception ex) {
            log.error("Lỗi trong quá trình phân tích kiểm duyệt khóa học {}: {}", courseId, ex.getMessage(), ex);
            markRunFailed(runId);
        }
    }

    /**
     * Phase 1: Transaction ngắn để đánh dấu trạng thái ANALYZING và trích xuất toàn bộ ngữ cảnh kiểm duyệt
     */
    @Transactional
    public ModerationContext prepareAndStartAnalysis(String courseId, String runId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        ModerationRun run = moderationRunRepository.findById(runId).orElse(null);
        if (course == null || run == null) {
            log.warn("Không tìm thấy course hoặc run để bắt đầu phân tích: courseId={}, runId={}", courseId, runId);
            return null;
        }

        run.setStatus("ANALYZING");
        moderationRunRepository.save(run);
        return contextBuilder.buildContext(course);
    }

    /**
     * Phase 3: Transaction ngắn để lưu các issues và cập nhật kết quả.
     * Cập nhật có điều kiện ở tầng Database: chỉ cập nhật nếu trạng thái hiện tại vẫn là ANALYZING.
     * Nếu bản ghi đã bị scheduler đánh dấu FAILED do timeout (>15 phút) thì không ghi đè.
     */
    @Transactional
    public void saveAnalysisResult(String courseId, String runId, ModerationContext ctx, ModerationRunner.RunResult result) {
        // Cập nhật có điều kiện nguyên tử ở DB
        int updated = moderationRunRepository.updateStatusIfAnalyzing(
                runId,
                "READY_FOR_REVIEW",
                result.getRiskScore(),
                result.getRiskLevel(),
                LocalDateTime.now()
        );

        if (updated == 0) {
            log.warn("Lượt phân tích {} không còn ở trạng thái ANALYZING (đã bị timeout thành FAILED hoặc hủy), hủy lưu issues.", runId);
            return;
        }

        ModerationRun run = moderationRunRepository.findById(runId).orElse(null);
        Course course = courseRepository.findById(courseId).orElse(null);
        if (run == null || course == null) {
            log.warn("Không tìm thấy run hoặc course để lưu chi tiết issues: runId={}, courseId={}", runId, courseId);
            return;
        }

        List<ModerationIssue> entityIssues = new ArrayList<>();
        for (RuleIssue ri : result.getIssues()) {
            String issueKey = ri.getIssueKey();
            if (issueKey == null || issueKey.isBlank()) {
                issueKey = RuleIssue.generateIssueKey(ri.getRuleId(), ri.getTargetType(), ri.getTargetId(), ctx.getContentHash());
            }

            entityIssues.add(ModerationIssue.builder()
                    .run(run)
                    .issueKey(issueKey)
                    .ruleId(ri.getRuleId())
                    .category(ri.getCategory())
                    .severity(ri.getSeverity().name())
                    .source(ri.getSource() != null ? ri.getSource() : "RULE")
                    .targetType(ri.getTargetType())
                    .targetId(ri.getTargetId())
                    .message(ri.getMessage())
                    .suggestion(ri.getSuggestion())
                    .evidence(ri.getEvidence())
                    .confidence(ri.getConfidence())
                    .model(ri.getModel())
                    .promptVersion(ri.getPromptVersion())
                    .build());
        }

        if (!entityIssues.isEmpty()) {
            moderationIssueRepository.saveAll(entityIssues);
        }

        // Cập nhật aiModerationReport tóm tắt (JSON)
        try {
            Map<String, Object> summaryReport = new LinkedHashMap<>();
            summaryReport.put("runId", run.getId());
            summaryReport.put("status", "READY_FOR_REVIEW");
            summaryReport.put("riskLevel", result.getRiskLevel());
            summaryReport.put("riskScore", result.getRiskScore());
            summaryReport.put("blockerCount", result.getBlockerCount());
            summaryReport.put("errorCount", result.getErrorCount());
            summaryReport.put("warningCount", result.getWarningCount());
            summaryReport.put("infoCount", result.getInfoCount());
            summaryReport.put("contentHash", ctx.getContentHash());
            summaryReport.put("totalIssues", entityIssues.size());

            course.setAiModerationReport(objectMapper.writeValueAsString(summaryReport));
            courseRepository.save(course);
        } catch (Exception e) {
            log.error("Lỗi khi serialize aiModerationReport: {}", e.getMessage());
        }

        log.info("Hoàn thành phân tích kiểm duyệt khóa học {}: RiskLevel={}, Errors={}, Warnings={}",
                courseId, result.getRiskLevel(), result.getErrorCount(), result.getWarningCount());

        try {
            realtimePublisher.publishToRole("ADMIN", "moderation-run", Map.of(
                    "courseId", courseId,
                    "runId", runId,
                    "status", "READY_FOR_REVIEW",
                    "riskLevel", result.getRiskLevel() != null ? result.getRiskLevel() : "LOW"
            ));
            realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of("reason", "MODERATION_READY", "courseId", courseId));
        } catch (Exception ex) {
            log.warn("[ModerationAnalysisService] Không thể phát sự kiện moderation-run READY: {}", ex.getMessage());
        }
    }

    @Transactional
    public void markRunFailed(String runId) {
        Runnable action = () -> {
            moderationRunRepository.findById(runId).ifPresent(run -> {
                run.setStatus("FAILED");
                run.setFinishedAt(LocalDateTime.now());
                moderationRunRepository.save(run);

                try {
                    String cId = run.getCourse() != null ? run.getCourse().getId() : "";
                    realtimePublisher.publishToRole("ADMIN", "moderation-run", Map.of(
                            "courseId", cId,
                            "runId", runId,
                            "status", "FAILED"
                    ));
                } catch (Exception ex) {
                    log.warn("[ModerationAnalysisService] Không thể phát sự kiện moderation-run FAILED: {}", ex.getMessage());
                }
            });
        };
        if (transactionTemplate != null && !TransactionSynchronizationManager.isActualTransactionActive()) {
            transactionTemplate.executeWithoutResult(status -> action.run());
        } else {
            action.run();
        }
    }

    /**
     * Tự động quét mỗi 60 giây và chuyển các lượt kiểm duyệt ở trạng thái ANALYZING quá 15 phút thành FAILED.
     * Đặt ngưỡng 15 phút để đảm bảo các khóa học dung lượng lớn có đủ thời gian phân tích với LLM.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void cleanupStuckRuns() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(15);
        List<ModerationRun> stuckRuns = moderationRunRepository.findByStatusAndSubmittedAtBefore("ANALYZING", threshold);
        for (ModerationRun run : stuckRuns) {
            log.warn("Tự động chuyển lượt kiểm duyệt kẹt (quá 15 phút) sang FAILED: runId={}, courseId={}",
                    run.getId(), run.getCourse() != null ? run.getCourse().getId() : "null");
            run.setStatus("FAILED");
            run.setFinishedAt(LocalDateTime.now());
            moderationRunRepository.save(run);

            try {
                String cId = run.getCourse() != null ? run.getCourse().getId() : "";
                realtimePublisher.publishToRole("ADMIN", "moderation-run", Map.of(
                        "courseId", cId,
                        "runId", run.getId(),
                        "status", "FAILED"
                ));
            } catch (Exception ex) {
                log.warn("[ModerationAnalysisService] Không thể phát sự kiện moderation-run TIMEOUT: {}", ex.getMessage());
            }
        }
    }
}
