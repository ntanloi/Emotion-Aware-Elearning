package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Slf4j
public class HttpModerationLlmClient implements ModerationLlmClient {

    private final LlmCacheService llmCacheService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    private final boolean enabled;
    private final String provider;
    private final String model;
    private final String apiKey;
    private final String apiUrl;
    private final int maxCallsPerCourse;
    private final int maxCallsPerDay;

    private String systemPrompt = "";

    // Bộ đếm giới hạn số lượt gọi trong ngày
    private volatile LocalDate currentDay = LocalDate.now();
    private final AtomicInteger dailyCallsCounter = new AtomicInteger(0);

    public HttpModerationLlmClient(
            LlmCacheService llmCacheService,
            ObjectMapper objectMapper,
            @Value("${app.moderation.llm.enabled:false}") boolean enabled,
            @Value("${app.moderation.llm.provider:openai}") String provider,
            @Value("${app.moderation.llm.model:gpt-4o-mini}") String model,
            @Value("${app.moderation.llm.api-key:}") String apiKey,
            @Value("${app.moderation.llm.api-url:https://api.openai.com/v1/chat/completions}") String apiUrl,
            @Value("${app.moderation.llm.timeout-ms:15000}") int timeoutMs,
            @Value("${app.moderation.llm.max-calls-per-course:20}") int maxCallsPerCourse,
            @Value("${app.moderation.llm.max-calls-per-day:100}") int maxCallsPerDay) {

        this.llmCacheService = llmCacheService;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.provider = provider;
        this.model = model;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.maxCallsPerCourse = maxCallsPerCourse;
        this.maxCallsPerDay = maxCallsPerDay;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restTemplate = new RestTemplate(factory);

        loadSystemPrompt();
    }

    private void loadSystemPrompt() {
        try {
            ClassPathResource res = new ClassPathResource("moderation/prompts/system_prompt.txt");
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    this.systemPrompt = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
                }
            }
        } catch (Exception ex) {
            log.warn("Không thể nạp tệp system_prompt.txt: {}", ex.getMessage());
            this.systemPrompt = "Bạn là trợ lý kiểm duyệt nội dung khóa học TOEIC. Chỉ trả về JSON hợp lệ.";
        }
    }

    @Override
    public boolean isEnabled() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String getModel() {
        return model;
    }

    @Override
    public String getProvider() {
        return provider;
    }

    @Override
    public LlmAnalysisResponse callLlm(String ruleId, String promptVersion, String promptTemplate, String dataJson, String contentHash) {
        if (!isEnabled()) {
            return LlmAnalysisResponse.failed("Lớp LLM chưa được bật hoặc chưa cấu hình API Key.", model, promptVersion);
        }

        // 1. Kiểm tra bộ nhớ đệm theo content_hash
        if (contentHash != null) {
            Optional<String> cached = llmCacheService.getCachedResult(contentHash, ruleId, promptVersion, model);
            if (cached.isPresent()) {
                log.debug("Trúng cache LLM cho rule {} (hash: {})", ruleId, contentHash);
                return LlmAnalysisResponse.builder()
                        .success(true)
                        .rawJson(cached.get())
                        .model(model)
                        .promptVersion(promptVersion)
                        .build();
            }
        }

        // 2. Kiểm tra giới hạn số lượt gọi mỗi ngày
        checkAndResetDailyCounter();
        if (dailyCallsCounter.get() >= maxCallsPerDay) {
            log.warn("Đã đạt giới hạn tối đa số lượt gọi LLM trong ngày ({}/{} lượt).", dailyCallsCounter.get(), maxCallsPerDay);
            return LlmAnalysisResponse.failed("Đã đạt hạn mức gọi LLM tối đa trong ngày.", model, promptVersion);
        }

        // 3. Đóng gói prompt với hàng rào chống chèn lệnh <data>...</data>
        String userContent = promptTemplate.replace("{data}", dataJson != null ? dataJson : "{}");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestPayload = new LinkedHashMap<>();
            requestPayload.put("model", model);
            requestPayload.put("temperature", 0.0);
            requestPayload.put("response_format", Collections.singletonMap("type", "json_object"));

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userContent));
            requestPayload.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestPayload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                dailyCallsCounter.incrementAndGet();

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    String content = choices.get(0).path("message").path("content").asText();

                    // Xác minh đầu ra là JSON hợp lệ theo yêu cầu SPEC mục 8
                    objectMapper.readTree(content);

                    // Lưu vào bộ nhớ đệm
                    if (contentHash != null) {
                        llmCacheService.saveCache(contentHash, ruleId, promptVersion, model, content);
                    }

                    return LlmAnalysisResponse.builder()
                            .success(true)
                            .rawJson(content)
                            .model(model)
                            .promptVersion(promptVersion)
                            .build();
                }
            }
        } catch (Exception ex) {
            log.warn("Lỗi khi gọi API LLM cho rule {}: {}. Kích hoạt chế độ chịu lỗi.", ruleId, ex.getMessage());
            return LlmAnalysisResponse.failed("Lỗi kết nối LLM: " + ex.getMessage(), model, promptVersion);
        }

        return LlmAnalysisResponse.failed("Không nhận được phản hồi hợp lệ từ LLM.", model, promptVersion);
    }

    private synchronized void checkAndResetDailyCounter() {
        LocalDate today = LocalDate.now();
        if (!today.equals(currentDay)) {
            currentDay = today;
            dailyCallsCounter.set(0);
        }
    }
}
