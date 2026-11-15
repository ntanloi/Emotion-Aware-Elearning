package com.elearning.emotion.service.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Slf4j
public class ChatLlmClient {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Getter
    private final boolean enabled;
    @Getter
    private volatile String model;
    private final String apiKey;
    private final String apiUrl;
    @Getter
    private final int maxUserMsgsPerDay;
    @Getter
    private final int maxCallsPerDay;

    private final boolean isGemini;
    private static final List<String> GEMINI_FALLBACK_MODELS = List.of(
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash"
    );

    private volatile LocalDate currentDay = LocalDate.now();
    private final AtomicInteger dailyCallsCounter = new AtomicInteger(0);

    public ChatLlmClient(
            ObjectMapper objectMapper,
            @Value("${app.chat.llm.enabled:false}") boolean enabled,
            @Value("${app.chat.llm.model:gpt-4o-mini}") String model,
            @Value("${app.chat.llm.api-key:}") String apiKey,
            @Value("${app.chat.llm.api-url:https://api.openai.com/v1/chat/completions}") String apiUrl,
            @Value("${app.chat.llm.timeout-ms:60000}") int timeoutMs,
            @Value("${app.chat.llm.max-user-msgs-per-day:30}") int maxUserMsgsPerDay,
            @Value("${app.chat.llm.max-calls-per-day:500}") int maxCallsPerDay) {

        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.maxUserMsgsPerDay = maxUserMsgsPerDay;
        this.maxCallsPerDay = maxCallsPerDay;

        boolean isGeminiKey = this.apiKey.startsWith("AQ.") || this.apiKey.startsWith("AIza");
        boolean isGeminiModel = model != null && model.toLowerCase().contains("gemini");
        this.isGemini = isGeminiKey || isGeminiModel;

        String resolvedApiUrl = (apiUrl != null && !apiUrl.isBlank()) ? apiUrl.trim() : "https://api.openai.com/v1/chat/completions";
        String resolvedModel = (model != null && !model.isBlank()) ? model.trim() : "gpt-4o-mini";

        if (this.isGemini) {
            if (resolvedApiUrl.contains("api.openai.com")) {
                resolvedApiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
            }
            if ("gpt-4o-mini".equalsIgnoreCase(resolvedModel)
                    || "gemini-1.5-flash".equalsIgnoreCase(resolvedModel)
                    || "gemini-2.0-flash".equalsIgnoreCase(resolvedModel)
                    || "gemini-2.5-flash".equalsIgnoreCase(resolvedModel)) {
                resolvedModel = "gemini-3.5-flash-lite";
            }
            log.info("[ChatLlmClient] Đang hoạt động ở chế độ Google Gemini. Endpoint: {}, Model: {}", resolvedApiUrl, resolvedModel);
        }

        this.apiUrl = resolvedApiUrl;
        this.model = resolvedModel;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restTemplate = new RestTemplate(factory);
    }

    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    private void checkAndResetDailyCounter() {
        LocalDate today = LocalDate.now();
        if (!today.equals(currentDay)) {
            synchronized (this) {
                if (!today.equals(currentDay)) {
                    currentDay = today;
                    dailyCallsCounter.set(0);
                }
            }
        }
    }

    public ChatLlmResponse callChat(String systemPrompt, List<Map<String, String>> historyMessages) {
        if (!isAvailable()) {
            return ChatLlmResponse.failed("Chatbot LLM chưa được bật hoặc chưa cấu hình API Key.", model);
        }

        checkAndResetDailyCounter();
        if (dailyCallsCounter.incrementAndGet() > maxCallsPerDay) {
            log.warn("[ChatLlmClient] Đạt hạn mức gọi LLM tối đa trong ngày ({}/{} lượt).", dailyCallsCounter.get(), maxCallsPerDay);
            return ChatLlmResponse.failed("Đã đạt hạn mức hệ thống trong ngày.", model);
        }

        List<String> modelsToTry = new ArrayList<>();
        modelsToTry.add(this.model);
        if (isGemini) {
            for (String fallback : GEMINI_FALLBACK_MODELS) {
                if (!modelsToTry.contains(fallback)) {
                    modelsToTry.add(fallback);
                }
            }
        }

        ChatLlmResponse lastResponse = null;

        for (String targetModel : modelsToTry) {
            try {
                ChatLlmResponse res = executeCall(targetModel, systemPrompt, historyMessages);
                if (res.isSuccess()) {
                    if (!targetModel.equals(this.model)) {
                        log.info("[ChatLlmClient] Đã kết nối thành công, ghi nhận model hoạt động: {}", targetModel);
                        this.model = targetModel;
                    }
                    return res;
                }
                lastResponse = res;
                if (!res.getErrorMessage().contains("404")
                        && !res.getErrorMessage().contains("503")
                        && !res.getErrorMessage().toLowerCase().contains("not found")) {
                    break;
                }
                log.warn("[ChatLlmClient] Model {} trả về lỗi ({}), thử model tiếp theo...", targetModel, res.getErrorMessage());
            } catch (ResourceAccessException ex) {
                log.warn("[ChatLlmClient] Timeout khi gọi model {}, thử model tiếp theo...", targetModel);
                lastResponse = ChatLlmResponse.failed("Timeout kết nối dịch vụ AI: " + ex.getMessage(), targetModel);
                if (isGemini) {
                    continue;
                }
                return lastResponse;
            } catch (HttpStatusCodeException ex) {
                log.warn("[ChatLlmClient] Lỗi HTTP {} với model {}: {}", ex.getStatusCode(), targetModel, ex.getResponseBodyAsString());
                lastResponse = ChatLlmResponse.failed("Lỗi từ dịch vụ AI (" + ex.getStatusCode() + "): " + ex.getStatusText(), targetModel);
                if (isGemini && (ex.getStatusCode() == HttpStatus.NOT_FOUND
                        || ex.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE
                        || ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS)) {
                    continue;
                }
                return lastResponse;
            } catch (Exception ex) {
                log.error("[ChatLlmClient] Lỗi kết nối khi gọi LLM (model {}): {}", targetModel, ex.getMessage());
                return ChatLlmResponse.failed("Lỗi kết nối dịch vụ AI: " + ex.getMessage(), targetModel);
            }
        }

        return lastResponse != null ? lastResponse : ChatLlmResponse.failed("Không thể kết nối dịch vụ AI.", model);
    }

    private ChatLlmResponse executeCall(String targetModel, String systemPrompt, List<Map<String, String>> historyMessages) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestPayload = new LinkedHashMap<>();
        requestPayload.put("model", targetModel);

        if (isGemini) {
            requestPayload.put("reasoning_effort", "low");
            requestPayload.put("max_tokens", 2048);
        } else {
            requestPayload.put("temperature", 0.3);
            requestPayload.put("max_tokens", 800);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        if (historyMessages != null && !historyMessages.isEmpty()) {
            messages.addAll(historyMessages);
        }
        requestPayload.put("messages", messages);

        String requestBody = objectMapper.writeValueAsString(requestPayload);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return ChatLlmResponse.failed("Lỗi gọi dịch vụ AI: " + response.getStatusCode(), targetModel);
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        if (root.has("error")) {
            String err = root.get("error").has("message") ? root.get("error").get("message").asText() : "Lỗi từ dịch vụ AI";
            return ChatLlmResponse.failed(err, targetModel);
        }

        JsonNode choices = root.get("choices");
        if (choices == null || !choices.isArray() || choices.isEmpty()) {
            return ChatLlmResponse.failed("Dịch vụ AI không trả về nội dung hợp lệ.", targetModel);
        }

        JsonNode messageNode = choices.get(0).get("message");
        String content = messageNode != null && messageNode.has("content") ? messageNode.get("content").asText() : "";

        Integer promptTokens = null;
        Integer completionTokens = null;
        JsonNode usageNode = root.get("usage");
        if (usageNode != null) {
            if (usageNode.has("prompt_tokens")) promptTokens = usageNode.get("prompt_tokens").asInt();
            if (usageNode.has("completion_tokens")) completionTokens = usageNode.get("completion_tokens").asInt();
        }

        return ChatLlmResponse.builder()
                .success(true)
                .content(content)
                .model(targetModel)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .build();
    }
}
