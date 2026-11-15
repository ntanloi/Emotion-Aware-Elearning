package com.elearning.emotion.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Bean thực thi bất đồng bộ riêng biệt cho quy trình kiểm duyệt,
 * giải phóng hoàn toàn khóa ghi và tránh tự inject proxy (@Lazy self).
 * Sử dụng ThreadPoolTaskExecutor có giới hạn ("moderationExecutor") để bảo vệ quota LLM và LanguageTool.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ModerationAsyncExecutor {

    private final ModerationAnalysisService moderationAnalysisService;

    @Async("moderationExecutor")
    public void executeAnalysisAsync(String courseId, String runId) {
        log.info("Bắt đầu thực thi phân tích kiểm duyệt nền (@Async moderationExecutor): courseId={}, runId={}", courseId, runId);
        try {
            moderationAnalysisService.runAnalysis(courseId, runId);
        } catch (Exception ex) {
            log.error("Lỗi ngoại lệ không xử lý trong luồng async kiểm duyệt: {}", ex.getMessage(), ex);
        }
    }
}
