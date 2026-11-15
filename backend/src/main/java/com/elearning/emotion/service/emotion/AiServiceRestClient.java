package com.elearning.emotion.service.emotion;

import com.elearning.emotion.config.AiServiceProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Implementation THAT: goi sang ai-service (Python, xem thu muc /ai-service) qua HTTP.
 * Ho tro ca endpoint moi /v1/predict-batch theo docs/ai-service-contract.md va /predict legacy.
 * H-c: Tu dong truyen header X-Internal-Secret neu duoc cau hinh.
 */
@Component
@Primary
@ConditionalOnProperty(prefix = "app.ai-service", name = "mock", havingValue = "false", matchIfMissing = true)
@Slf4j
public class AiServiceRestClient implements EmotionRecognitionClient {

    private final AiServiceProperties props;
    private final RestTemplate restTemplate;
    private final MockEmotionRecognitionClient fallbackClient = new MockEmotionRecognitionClient();

    public AiServiceRestClient(AiServiceProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplateBuilder()
                .setConnectTimeout(Duration.ofMillis(props.getTimeoutMs()))
                .setReadTimeout(Duration.ofMillis(props.getTimeoutMs()))
                .build();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (props.getSecret() != null && !props.getSecret().isBlank()) {
            headers.set("X-Internal-Secret", props.getSecret());
        }
        return headers;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<EmotionPrediction> predictBatch(List<String> base64Images) {
        return predictBatch(null, base64Images);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<EmotionPrediction> predictBatch(String sessionId, List<String> base64Images) {
        String baseUrl = props.getBaseUrl() != null ? props.getBaseUrl().replaceAll("/+$", "") : "http://localhost:8000";
        String urlV1 = baseUrl + "/v1/predict-batch";
        List<Map<String, Object>> frames = base64Images.stream()
                .map(img -> Map.<String, Object>of("image", img))
                .toList();
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("frames", frames);
        if (sessionId != null && !sessionId.isBlank()) {
            body.put("session_id", sessionId);   // ai-service moi dung de tach baseline tung hoc vien
        }
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, buildHeaders());

        try {
            Map<String, Object> response = restTemplate.exchange(urlV1, HttpMethod.POST, requestEntity, Map.class).getBody();
            if (response == null) throw new IllegalStateException("ai-service tra ve rong");

            String modelVersion = (String) response.get("model_version");
            List<Map<String, Object>> predictions = (List<Map<String, Object>>) response.get("predictions");

            if (predictions != null) {
                return predictions.stream().map(p -> new EmotionPrediction(
                        (String) p.get("emotion_label"),
                        (String) p.get("learning_state"),
                        ((Number) p.getOrDefault("confidence", 0.8)).floatValue(),
                        (Map<String, Float>) p.get("raw_emotion_scores"),
                        modelVersion,
                        null,
                        (List<String>) p.get("cues")
                )).toList();
            }

        } catch (Exception ex) {
            log.warn("Goi /v1/predict-batch khong thanh cong ({}), thu endpoint /predict legacy...", ex.getMessage());
            try {
                String urlLegacy = baseUrl + "/predict";
                Map<String, Object> legacyBody = new java.util.HashMap<>();
                legacyBody.put("images", base64Images);
                if (sessionId != null && !sessionId.isBlank()) legacyBody.put("session_id", sessionId);
                HttpEntity<Map<String, Object>> legacyEntity = new HttpEntity<>(legacyBody, buildHeaders());
                Map<String, Object> legacyResponse = restTemplate.exchange(urlLegacy, HttpMethod.POST, legacyEntity, Map.class).getBody();

                if (legacyResponse != null) {
                    String modelVersion = (String) legacyResponse.get("model_version");
                    List<Map<String, Object>> results = (List<Map<String, Object>>) legacyResponse.get("results");
                    return results.stream().map(r -> new EmotionPrediction(
                            (String) r.get("emotion_label"),
                            ((Number) r.get("confidence_score")).floatValue(),
                            (Map<String, Float>) r.get("raw_scores"),
                            modelVersion
                    )).toList();
                }
            } catch (Exception ex2) {
                log.error("Goi ai-service that bai, tra ve du lieu an toan: {}", ex2.getMessage());
            }
        }

        // Fail-safe khi ai-service không khả dụng: Chuyển sang fallback mock thông minh (chỉ báo NO_FACE nếu ảnh đen hoàn toàn)
        log.warn("[AiServiceRestClient] ai-service không phản hồi hoặc đang khởi động, sử dụng chế độ dự phòng mock thông minh thay vì báo rời camera giả.");
        return fallbackClient.predictBatch(base64Images);
    }
}
