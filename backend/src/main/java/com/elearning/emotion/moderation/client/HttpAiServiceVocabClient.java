package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class HttpAiServiceVocabClient implements AiServiceVocabClient {

    private final String baseUrl;
    private final boolean enabled;
    private final String secret;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final Map<String, VocabCheckResultDto> vocabCache = new ConcurrentHashMap<>();
    private final Map<String, List<String>> lemmaCache = new ConcurrentHashMap<>();

    private volatile boolean lastAvailable = true;

    public HttpAiServiceVocabClient(
            @Value("${app.moderation.ai-service.url:http://localhost:8000}") String baseUrl,
            @Value("${app.moderation.ai-service.enabled:true}") boolean enabled,
            @Value("${app.ai-service.secret:}") String secret,
            @Value("${app.moderation.ai-service.timeout-ms:4000}") int timeoutMs,
            ObjectMapper objectMapper) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.enabled = enabled;
        this.secret = secret != null ? secret.trim() : "";
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public Map<String, VocabCheckResultDto> checkVocabBatch(List<VocabCheckItemDto> items) {
        if (!enabled || items == null || items.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, VocabCheckResultDto> resultMap = new HashMap<>();
        List<VocabCheckItemDto> toFetch = new ArrayList<>();

        for (VocabCheckItemDto item : items) {
            String wordKey = item.getWord().toLowerCase().trim();
            if (vocabCache.containsKey(wordKey)) {
                resultMap.put(wordKey, vocabCache.get(wordKey));
            } else {
                toFetch.add(item);
            }
        }

        if (toFetch.isEmpty()) {
            return resultMap;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (!secret.isBlank()) {
                headers.set("X-Internal-Secret", secret);
            }

            Map<String, Object> payload = Collections.singletonMap("words", toFetch);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            String targetUrl = baseUrl + "/v1/vocab/check";
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                lastAvailable = true;
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode results = root.path("results");
                if (results.isArray()) {
                    for (JsonNode node : results) {
                        VocabCheckResultDto dto = objectMapper.treeToValue(node, VocabCheckResultDto.class);
                        String k = dto.getWord().toLowerCase().trim();
                        vocabCache.put(k, dto);
                        resultMap.put(k, dto);
                    }
                }
                return resultMap;
            }
        } catch (Exception ex) {
            if (lastAvailable) {
                log.warn("Không thể kết nối ai-service từ điển tại {}: {}. Kích hoạt chế độ chịu lỗi.",
                        baseUrl, ex.getMessage());
                lastAvailable = false;
            }
        }

        return resultMap;
    }

    @Override
    public List<String> getLemmas(String text) {
        if (!enabled || text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String cacheKey = text.trim();
        if (lemmaCache.containsKey(cacheKey)) {
            return lemmaCache.get(cacheKey);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (!secret.isBlank()) {
                headers.set("X-Internal-Secret", secret);
            }

            Map<String, Object> payload = Collections.singletonMap("text", text);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            String targetUrl = baseUrl + "/v1/text/lemma";
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                lastAvailable = true;
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode lemmasNode = root.path("lemmas");
                if (lemmasNode.isArray()) {
                    List<String> list = new ArrayList<>();
                    for (JsonNode l : lemmasNode) {
                        list.add(l.asText());
                    }
                    lemmaCache.put(cacheKey, list);
                    return list;
                }
            }
        } catch (Exception ex) {
            if (lastAvailable) {
                log.warn("Không thể kết nối ai-service lemma tại {}: {}. Kích hoạt chế độ chịu lỗi.",
                        baseUrl, ex.getMessage());
                lastAvailable = false;
            }
        }

        return Collections.emptyList();
    }

    @Override
    public boolean isAvailable() {
        return enabled && lastAvailable;
    }
}
