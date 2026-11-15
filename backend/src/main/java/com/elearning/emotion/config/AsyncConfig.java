package com.elearning.emotion.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Bounded thread pool cho kiểm duyệt khóa học:
     * - Giới hạn 2-3 worker chạy song song để không đốt quota LLM hay làm quá tải LanguageTool khi nhiều khóa được gửi duyệt.
     * - Hàng đợi 25 tác vụ, khi đầy ném RejectedExecutionException để ModerationAnalysisService đánh FAILED ngay.
     */
    @Bean(name = "moderationExecutor")
    public Executor moderationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(3);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("moderation-exec-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }
}
