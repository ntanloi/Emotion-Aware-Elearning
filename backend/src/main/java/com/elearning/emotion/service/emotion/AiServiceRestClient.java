package com.elearning.emotion.service.emotion;

import com.elearning.emotion.config.AiServiceProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Implementation THAT: goi sang ai-service (Python, xem thu muc /ai-service) qua HTTP.
 *
 * ============== HUONG DAN KICH HOAT KHI AI DA SAN SANG ==============
 * 1. Xoa (hoac comment) @Primary tren MockEmotionRecognitionClient.
 * 2. Bo comment @Primary o class nay (hoac set bien moi truong nhu goi y ben duoi).
 * 3. Dam bao ai-service dang chay va app.ai-service.base-url tro dung dia chi.
 * Khong can sua bat ky controller/entity/frontend nao khac vi tat ca deu code theo
 * interface EmotionRecognitionClient, khong theo class cu the.
 * ======================================================================
 */
@Component
@Slf4j
@RequiredArgsConstructor
// @Primary   // <-- bat dong nay len khi AI service that da san sang
public class AiServiceRestClient implements EmotionRecognitionClient {

    private final AiServiceProperties props;

    private RestTemplate restTemplate() {
        return new RestTemplateBuilder()
                .setConnectTimeout(Duration.ofMillis(props.getTimeoutMs()))
                .setReadTimeout(Duration.ofMillis(props.getTimeoutMs()))
                .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<EmotionPrediction> predictBatch(List<String> base64Images) {
        String url = props.getBaseUrl() + "/predict";
        Map<String, Object> body = Map.of("images", base64Images);

        try {
            Map<String, Object> response = restTemplate().postForObject(url, body, Map.class);
            if (response == null) throw new IllegalStateException("ai-service tra ve rong");

            String modelVersion = (String) response.get("model_version");
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");

            return results.stream().map(r -> new EmotionPrediction(
                    (String) r.get("emotion_label"),
                    ((Number) r.get("confidence_score")).floatValue(),
                    (Map<String, Float>) r.get("raw_scores"),
                    modelVersion
            )).toList();

        } catch (Exception ex) {
            // NFR "Kha dung": loi AI KHONG duoc lam gian doan viec hoc (fail-safe, tinh than BR-03)
            log.error("Goi ai-service that bai, tra ve rong de khong chan luong hoc: {}", ex.getMessage());
            return base64Images.stream()
                    .map(i -> new EmotionPrediction("no_face", 0f, Map.of(), "ai-service-unavailable"))
                    .toList();
        }
    }
}
